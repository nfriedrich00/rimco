#!/usr/bin/env python3
"""
Publishes nav_msgs/Odometry on /demo/odom that matches /demo/fix circle.
Orientation yaw points tangent to the path.
"""
import math, rclpy
from rclpy.node import Node
from nav_msgs.msg import Odometry
from geometry_msgs.msg import Quaternion
from std_msgs.msg import Header
import numpy as np

LAT0 = 50.92570234902536
LON0 = 13.331672374817645
RADIUS = 20.0
SPEED  = 1.0
DT     = 1.0
EARTH_R = 6_378_137.0

def euler_to_quaternion(yaw, pitch, roll):

        qx = np.sin(roll/2) * np.cos(pitch/2) * np.cos(yaw/2) - np.cos(roll/2) * np.sin(pitch/2) * np.sin(yaw/2)
        qy = np.cos(roll/2) * np.sin(pitch/2) * np.cos(yaw/2) + np.sin(roll/2) * np.cos(pitch/2) * np.sin(yaw/2)
        qz = np.cos(roll/2) * np.cos(pitch/2) * np.sin(yaw/2) - np.sin(roll/2) * np.sin(pitch/2) * np.cos(yaw/2)
        qw = np.cos(roll/2) * np.cos(pitch/2) * np.cos(yaw/2) + np.sin(roll/2) * np.sin(pitch/2) * np.sin(yaw/2)

        return (qx, qy, qz, qw)

class Odom(Node):
    def __init__(self):
        super().__init__("odom_circle")
        self.pub = self.create_publisher(Odometry, "/demo/odom", 10)
        self.t = 0.0
        self.timer = self.create_timer(DT, self.tick)

    def tick(self):
        self.t += SPEED * DT / RADIUS
        x = RADIUS * math.cos(self.t)
        y = RADIUS * math.sin(self.t)
        yaw = self.t + math.pi / 2  # tangent direction

        # metres → lat/lon (needed for consistency with fix)
        dlat = (y / EARTH_R) * 180 / math.pi
        dlon = (x / (EARTH_R * math.cos(math.radians(LAT0)))) * 180 / math.pi

        q = Quaternion()
        q.x, q.y, q.z, q.w = euler_to_quaternion(yaw, 0, 0)

        msg = Odometry()
        msg.header = Header()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = "odom"
        msg.pose.pose.position.x = x
        msg.pose.pose.position.y = y
        msg.pose.pose.orientation = q
        # reuse lat/lon in pose.covariance[0:2] if you like
        self.pub.publish(msg)

def main():
    rclpy.init()
    Odom()
    rclpy.spin(Odom())

if __name__ == "__main__":
    main()
