#include <stdio.h>
#include <wiringPi.h>
#include <stdlib.h>

int main (int argc, char **argv)
{
//  printf ("Raspberry Pi blink\n") ;
  int p1,p2,p3,p4;
  if (argc < 4) {
    printf("usage: motor <steps> <startspeed (>200000)> <acceleration> (larger delay = slower) <direction> (0/1)\n");
    exit(1);
  }

  p1 = atoi(argv[1]); /* better to use strtol */
  p2 = atoi(argv[2]); /* better to use strtol */
  p3 = atoi(argv[3]); /* better to use strtol */
  p4 = atoi(argv[4]); /* better to use strtol */
  printf("steps=%d delay=%d\n", p1,p2);

  if (wiringPiSetup () == -1)
    return 1 ;

  pinMode (0, OUTPUT) ;         // aka BCM_GPIO pin 17
  pinMode (2, OUTPUT) ;         // aka BCM_GPIO pin 27
  pinMode (4,OUTPUT);

  digitalWrite(4,0);		// enable motor
  if (p4==0){
    digitalWrite (2, 1) ;       // Open
  }else{
    digitalWrite (2, 0) ;       // Toe
  }

  double accel,decel;
  double acceloffset=0.03;
  int totalsteps=p1;
  for (int i=0;i<totalsteps;i++)
  {
    int extradelay=0;
    digitalWrite (0, 1) ;       // On
    delayMicroseconds (p2/100) ;               // mS
    digitalWrite (0, 0) ;       // Off
    delayMicroseconds (p2/100) ;
  }
  if (p2 > 200000){
    p2-=p3;
  }

  // Doos is dichtgegaan
  if (p4 == 0){
   digitalWrite(4,1); // disable motor
  }

  return 0 ;
}
