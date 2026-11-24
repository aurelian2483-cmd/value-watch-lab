import unittest
from unittest.mock import patch, Mock
from hardware_inventory import parse_linux_memory, memory_result, physical_memory, cpu_inventory, gpu_inventory

class HardwareTests(unittest.TestCase):
    def test_linux_memory_units_and_missing_fields(self):
        r=parse_linux_memory("MemTotal: 4096 kB\nMemAvailable: 2048 kB\n")
        self.assertEqual(r["totalBytes"],4194304)
        self.assertEqual(r["availableBytes"],2097152)
        for text in ("MemTotal: 1 kB","MemTotal: 1 kB\nMemAvailable: 2 kB","MemTotal: 1 kB\nMemTotal: 2 kB\nMemAvailable: 1 kB","MemTotal: 1 MB\nMemAvailable: 0 kB"):
            self.assertEqual(parse_linux_memory(text)["status"],"UNAVAILABLE")
    def test_missing_memory_is_not_zero(self):
        self.assertIsNone(memory_result(None,None,"test")["availableBytes"])
        with patch("hardware_inventory.platform.system",return_value="Other"):
            self.assertEqual(physical_memory()["status"],"UNAVAILABLE")
    def test_real_cpu_inventory(self):
        r=cpu_inventory()
        self.assertEqual(r["gpu"]["status"],"NOT_PROBED")
        self.assertTrue(r["reportedCpuSlots"] is None or r["reportedCpuSlots"]>0)
        self.assertIn(r["physicalMemory"]["status"],("REPORTED","UNAVAILABLE"))
    def test_gpu_inventory_mocked(self):
        runtime=Mock()
        runtime.getDeviceProperties.return_value={"name":b"Synthetic GPU","major":8,"minor":9}
        runtime.driverGetVersion.return_value=12040
        runtime.runtimeGetVersion.return_value=12040
        runtime.memGetInfo.return_value=(1024,2048)
        r=gpu_inventory(runtime)
        self.assertEqual(r["status"],"REPORTED")
        self.assertEqual(r["memory"]["availableBytes"],1024)
        self.assertEqual(r["computeCapability"],[8,9])
    def test_gpu_metadata_failure_stays_unknown(self):
        runtime=Mock()
        runtime.getDeviceProperties.side_effect=RuntimeError()
        runtime.driverGetVersion.side_effect=RuntimeError()
        runtime.runtimeGetVersion.return_value=12040
        runtime.memGetInfo.side_effect=RuntimeError()
        r=gpu_inventory(runtime)
        self.assertEqual(r["status"],"PARTIAL")
        self.assertIsNone(r["driverVersionCode"])
        self.assertIsNone(r["memory"]["totalBytes"])
