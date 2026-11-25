"""Hosted fixed QA acceptance using the scheduler's actual admission path."""
from hosted_acceptance import main
from scheduler import Scheduler,digest

def admit(service,tokens,revision):
    now=service._clock()
    plan={"schema":1,"revision":revision,"opensAt":now,"closesAt":now+120,"scope":"FIXED_QA_ONLY"}
    schedule=Scheduler(service,tokens["operator"],plan,digest(plan))
    first=schedule.poll(tokens["operator"])
    if first["state"]!="ADMITTED" or first["productionDispatchAuthorized"] or first["gpuDispatchAuthorized"] or first["homePcRequired"]:
        raise RuntimeError("Unsafe admission state")
    if schedule.poll(tokens["operator"])!=first:
        raise RuntimeError("Admission replay changed the schedule")
    if len(service.status(tokens["observer"])["events"])!=3:
        raise RuntimeError("Admission must create exactly three queue events")
    print("PASS fixed QA schedule admission: one durable window, no duplicate jobs, GPU blocked")

if __name__=="__main__":
    main(admit)
