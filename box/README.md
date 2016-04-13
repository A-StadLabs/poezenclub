I added these lines to /etc/rc.local:

setterm -blank 0 -powerdown 0 -powersave off
/home/pi/poezenclub/box/start.sh &
exit 0

to boot the box on start of the OS.


