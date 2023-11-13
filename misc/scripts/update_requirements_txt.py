import subprocess as sp


DESIRED_DEPS = {
    'pulumi': 'pulumi>=3.5.1,<4.0.0',

    'pulumi-azure': 'pulumi-azure>=4.7.0,<5.0.0',
    'pulumi-azure-native': 'pulumi-azure-native>=2.0.0,<3.0.0',
    'pulumi-azuread': 'pulumi-azuread>=4.3.0,<5.0.0',
    'pulumi-digitalocean': 'pulumi-digitalocean>=4.4.1,<5.0.0',
    'pulumi-docker': 'pulumi-docker>=3.0.0,<4.0.0',
    'pulumi-equinix': 'pulumi-equinix>=0.0.0,<1.0.0',
    'pulumi-gcp': 'pulumi-gcp>=7.0.0,<8.0.0',
    'pulumi-kubernetes': 'pulumi-kubernetes>=3.4.0,<4.0.0',
    'pulumi-libvirt': 'pulumi-libvirt>=0.1.0,<1.0.0',
    'pulumi-mysql': 'pulumi-mysql>=3.0.0,<4.0.0',
    'pulumi-openstack': 'pulumi-openstack>=3.2.0,<4.0.0',
    'pulumi-packet': 'pulumi-packet>=3.2.2,<4.0.0',
    'pulumi-policy': 'pulumi-policy>=1.3.0,<2.0.0',
    'pulumi-random': 'pulumi-random>=4.2.0,<5.0.0',
    'pulumi-tls': 'pulumi-tls>=4.0.0,<5.0.0',
}


fs = sp.check_output('git ls-files', shell=True).decode().split('\n')


requirements_txt_files = [
    f
    for f in fs
    if f.endswith('requirements.txt')
]


def read_file_lines(f):
    with open(f, 'r') as fp:
        return fp.readlines()


def write_file_lines(f, lines):
    with open(f, 'w') as fp:
        fp.writelines(lines)


def fix_line(line):
    for prefix, dep in DESIRED_DEPS.items():
        if line.startswith(f'{prefix}>='):
            return f"{dep}\n"
    return line


def fix_lines(lines):
    return [fix_line(line) for line in lines]


if __name__ == '__main__':
    for f in requirements_txt_files:
        write_file_lines(f, fix_lines(read_file_lines(f)))
