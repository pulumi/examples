#!/bin/bash

# install prerequisites
sudo apt-get -q update
apt-get upgrade -y
apt-get install git build-essential -y


# install java
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 0xB1998361219BD9C9
sudo apt-add-repository "deb http://repos.azul.com/azure-only/zulu/apt stable main"
apt-get install gcc -y
sudo apt-get -y install zulu-11-azure-jdk

# create minecraft user
useradd -r -m -U -d /opt/minecraft -s /bin/bash minecraft

# intall mcrcon
sudo -H -u minecraft mkdir -p /opt/minecraft/{backups,tools,server}
sudo -H -u minecraft git clone https://github.com/Tiiffi/mcrcon.git /opt/minecraft/tools/mcrcon
sudo -H -u minecraft gcc -std=gnu11 -pedantic  -Wextra -O2 -s -o /opt/minecraft/tools/mcrcon/mcrcon /opt/minecraft/tools/mcrcon/mcrcon.c

# install minecraft server 1.16.4
# download URL will change with new versions, client and server versions must match
sudo -H -u minecraft wget https://launcher.mojang.com/v1/objects/35139deedbd5182953cf1caa23835da59ca3d7cd/server.jar -P /opt/minecraft/server
sudo -H -u minecraft touch /opt/minecraft/server/eula.txt
sudo -H -u minecraft echo 'eula=true' >> /opt/minecraft/server/eula.txt

# configure server properties
sudo -H -u minecraft touch /opt/minecraft/server/server.properties
sudo -H -u minecraft printf 'rcon.port=25575\n' >> /opt/minecraft/server/server.properties
sudo -H -u minecraft printf 'rcon.password=strongpassword\n' >> /opt/minecraft/server/server.properties
sudo -H -u minecraft printf 'enable-rcon=true\n' >> /opt/minecraft/server/server.properties

# create a service
touch /etc/systemd/system/minecraft.service
printf '[Unit]\nDescription=Minecraft Server\nAfter=network.target\n\n' >> /etc/systemd/system/minecraft.service
printf '[Service]\nUser=minecraft\nNice=1\nKillMode=none\n' >> /etc/systemd/system/minecraft.service
printf 'SuccessExitStatus=0 1\nProtectHome=true\n' >> /etc/systemd/system/minecraft.service
printf 'ProtectSystem=full\nPrivateDevices=true\nNoNewPrivileges=true\n' >> /etc/systemd/system/minecraft.service
printf 'WorkingDirectory=/opt/minecraft/server\n'  >> /etc/systemd/system/minecraft.service
printf 'ExecStart=/usr/bin/java -Xmx2048M -Xms512M -XX:+UseG1GC -jar server.jar nogui\n\n' >> /etc/systemd/system/minecraft.service
printf 'ExecStop=/opt/minecraft/tools/mcrcon/mcrcon -H 127.0.0.1 -P 25575 -p strongpassword stop\n'  >> /etc/systemd/system/minecraft.service
printf '[Install]\nWantedBy=multi-user.target\n'  >> /etc/systemd/system/minecraft.service

# start the service
systemctl daemon-reload
systemctl start minecraft
systemctl enable minecraft
