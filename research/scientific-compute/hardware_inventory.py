"""Read-only hardware snapshots; no driver installs, external commands or network."""
import os
import platform
import re
from pathlib import Path

def memory_result(total, available, source):
    if type(total) is not int or type(available) is not int or not 0 <= available <= total or total <= 0:
        return {"status":"UNAVAILABLE","totalBytes":None,"availableBytes":None,"source":source}
    return {"status":"REPORTED","totalBytes":total,"availableBytes":available,"source":source}

def parse_linux_memory(text):
    values={}
    for line in text.splitlines():
        match=re.fullmatch(r"(MemTotal|MemAvailable):\s+(\d+)\s+kB\s*",line)
        if match:
            key=match.group(1)
            if key in values:
                return memory_result(None,None,"proc-meminfo")
            values[key]=int(match.group(2))*1024
    return memory_result(values.get("MemTotal"),values.get("MemAvailable"),"proc-meminfo")

def windows_memory():
    import ctypes
    from ctypes import wintypes
    class MEMORYSTATUSEX(ctypes.Structure):
        _fields_=[("dwLength",wintypes.DWORD),("dwMemoryLoad",wintypes.DWORD),
                  ("ullTotalPhys",ctypes.c_ulonglong),("ullAvailPhys",ctypes.c_ulonglong),
                  ("ullTotalPageFile",ctypes.c_ulonglong),("ullAvailPageFile",ctypes.c_ulonglong),
                  ("ullTotalVirtual",ctypes.c_ulonglong),("ullAvailVirtual",ctypes.c_ulonglong),
                  ("ullAvailExtendedVirtual",ctypes.c_ulonglong)]
    data=MEMORYSTATUSEX()
    data.dwLength=ctypes.sizeof(data)
    fn=ctypes.WinDLL("kernel32",use_last_error=True).GlobalMemoryStatusEx
    fn.argtypes=[ctypes.POINTER(MEMORYSTATUSEX)]
    fn.restype=wintypes.BOOL
    if not fn(ctypes.byref(data)):
        return memory_result(None,None,"GlobalMemoryStatusEx")
    return memory_result(int(data.ullTotalPhys),int(data.ullAvailPhys),"GlobalMemoryStatusEx")

def physical_memory():
    system=platform.system()
    try:
        if system=="Linux":
            with Path("/proc/meminfo").open(encoding="ascii") as stream:
                text=stream.read(32769)
            return parse_linux_memory(text) if len(text)<=32768 else memory_result(None,None,"proc-meminfo")
        if system=="Windows":
            return windows_memory()
    except (OSError,ValueError,AttributeError,ImportError):
        pass
    return memory_result(None,None,system)

def cpu_inventory():
    logical=os.cpu_count()
    slots=None
    source="unavailable"
    try:
        if hasattr(os,"sched_getaffinity"):
            slots=len(os.sched_getaffinity(0))
            source="sched_getaffinity"
        elif hasattr(os,"process_cpu_count"):
            slots=os.process_cpu_count()
            source="process_cpu_count"
    except OSError:
        pass
    if type(slots) is not int or slots<=0:
        slots=logical
        source="os.cpu_count_estimate"
    return {"logicalCpuCount":logical,"reportedCpuSlots":slots,"cpuSlotSource":source,
            "platform":platform.system(),"architecture":platform.machine(),"python":platform.python_version(),
            "physicalMemory":physical_memory(),"gpu":{"status":"NOT_PROBED","devices":None}}

def gpu_inventory(runtime,device_index=0):
    # Only called inside the explicitly selected device context.
    out={"status":"REPORTED","deviceIndex":device_index,"name":None,"computeCapability":None,
         "driverVersionCode":None,"runtimeVersionCode":None,"memory":memory_result(None,None,"cudaMemGetInfo"),
         "unavailableFields":[]}
    try:
        props=runtime.getDeviceProperties(device_index)
        name=props.get("name")
        if isinstance(name,bytes):
            name=name.decode("utf-8",errors="replace")
        if not isinstance(name,str) or not name.strip():
            raise ValueError("Missing device name")
        out["name"]="".join(c for c in name if c.isprintable())[:128]
        major,minor=props.get("major"),props.get("minor")
        if type(major) is int and type(minor) is int and major>=0 and minor>=0:
            out["computeCapability"]=[major,minor]
    except Exception:
        pass
    for key,method in (("driverVersionCode","driverGetVersion"),("runtimeVersionCode","runtimeGetVersion")):
        try:
            value=getattr(runtime,method)()
            if type(value) is int and value>0:
                out[key]=value
        except Exception:
            pass
    try:
        free,total=runtime.memGetInfo()
        out["memory"]=memory_result(total,free,"cudaMemGetInfo")
    except Exception:
        pass
    out["unavailableFields"]=[key for key in ("name","computeCapability","driverVersionCode","runtimeVersionCode") if out[key] is None]
    if out["memory"]["status"]!="REPORTED":
        out["unavailableFields"].append("memory")
    if out["unavailableFields"]:
        out["status"]="PARTIAL"
    return out
