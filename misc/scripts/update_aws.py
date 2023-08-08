"""
Update AWS dependencies.
"""

import argparse
import subprocess as sp
import re
import os
import json


ap = argparse.ArgumentParser()
ap.add_argument('--goversion')
ap.add_argument('--nodeversion')

args = ap.parse_args()


def go_deps(go_mod_file):
    cdir = os.path.dirname(go_mod_file)
    sp.check_call(['go', 'mod', 'tidy'], cwd=cdir)
    x = sp.check_output(['go', 'list', '-m', 'all'], cwd=cdir)
    r = {}
    for kv in (dep.split(' ') for dep in x.decode('utf-8').split('\n') if dep):
        if len(kv) > 1:
            r[kv[0]] = kv[1]
    return r


def aws_dep(go_mod_file):
    deps = go_deps(go_mod_file)
    for d in deps:
        if 'github.com/pulumi/pulumi-aws/sdk' in d:
            return {'pkg': d, 'version': deps[d]}


def update_aws_dep(go_mod_file, target_version):
    cdir = os.path.dirname(go_mod_file)
    old_dep = aws_dep(go_mod_file)
    if old_dep:
        sp.check_call(['go', 'mod', 'edit', '-droprequire='+old_dep['pkg']], cwd=cdir)
    new_pkg = re.sub(r'/v\d+$', '/v6', old_dep['pkg'])
    new_spec = new_pkg+'@'+target_version
    sp.check_call(['go', 'mod', 'edit', '-require='+new_spec], cwd=cdir)
    sp.check_call(['go', 'mod', 'tidy'], cwd=cdir)


if args.goversion:
    go_mod_files = [f for f in sp.check_output(['git', 'ls-files',  '**go.mod']).decode('utf-8').split('\n') if f]
    for f in go_mod_files:
        if aws_dep(f) is not None:
            update_aws_dep(f, args.goversion)


if args.nodeversion:
    pkg_json_files = [f for f in sp.check_output(['git', 'ls-files',  '**package.json']).decode('utf-8').split('\n') if f]
    for f in pkg_json_files:
        if '@pulumi/aws' in json.load(open(f)).get('dependencies', {}):
            cdir = os.path.dirname(f)
            try:
                sp.check_call(['npm', 'i', '@pulumi/aws@'+args.nodeversion], cwd=cdir)
            except:
                print(f'WARN ignoring failing {f}, proceeding')
