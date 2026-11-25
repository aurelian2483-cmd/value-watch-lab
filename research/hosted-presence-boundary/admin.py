"""Local administrative CLI; no listener, credentials never supplied as arguments."""
import argparse
import getpass
import json
import os
import sqlite3
import sys
import warnings
from boundary import provision,existing

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("action",choices=("provision","status","revoke-pc"))
    args=p.parse_args()
    try:
        if args.action=="provision":
            provision(os.environ)
            print("Private presence store provisioned. No worker connected.")
            return
        _,registry,_,_=existing(os.environ)
        with warnings.catch_warnings():
            warnings.simplefilter("error",getpass.GetPassWarning)
            token=getpass.getpass("Local operator or observer credential: ")
        if args.action=="status":
            print(json.dumps(registry.status(token),sort_keys=True))
        else:
            registry.revoke(token)
            print("PC credential revoked; no dispatch authorized.")
    except (OSError,ValueError,sqlite3.Error,EOFError,getpass.GetPassWarning,KeyError,TypeError):
        print("Operation refused. Check approved configuration and private state.",file=sys.stderr)
        sys.exit(1)
if __name__=="__main__":
    main()
