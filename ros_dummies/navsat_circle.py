#!/usr/bin/env python3
"""
Publishes sensor_msgs/NavSatFix on /demo/fix.
The position traces a 20 m radius circle around TU Freiberg Department of
Computer Science (50.92570234902536, 13.331672374817645) at ~1 m/s.
"""
import math
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import NavSatFix, NavSatStatus

LAT0 = 50.92570234902536
LON0 = 13.331672374817645
RADIUS = 20.0            # metres
SPEED  = 1.0             # m/s tangential
DT     = 1.0             # publish period (s)

EARTH_R = 6_378_137.0    # metres

class CircleFix(Node):
    def __init__(self):
        super().__init__("navsat_circle")
        self.pub = self.create_publisher(NavSatFix, "/demo/fix", 10)
        self.theta = 0.0
        self.timer = self.create_timer(DT, self.tick)

    def tick(self):
        # advance angle
        self.theta += SPEED * DT / RADIUS
        x = RADIUS * math.cos(self.theta)
        y = RADIUS * math.sin(self.theta)

        # metres → degrees
        dlat = (y / EARTH_R) * (180.0 / math.pi)
        dlon = (x / (EARTH_R * math.cos(math.radians(LAT0)))) * (180.0 / math.pi)

        msg = NavSatFix()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.status.status = NavSatStatus.STATUS_FIX
        msg.latitude  = LAT0 + dlat
        msg.longitude = LON0 + dlon
        msg.altitude  = 0.0
        self.pub.publish(msg)

def main():
    rclpy.init()
    CircleFix()
    rclpy.spin(CircleFix())

if __name__ == "__main__":
    main()
