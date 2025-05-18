#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import Bool
import random, time

class Beacon(Node):
    def __init__(self):
        super().__init__("bool_beacon")
        self.pub = self.create_publisher(Bool, "/demo/bool", 1)
        self.timer = self.create_timer(1.0, self.tick)

    def tick(self):
        msg = Bool(data=random.random() > 0.5)
        self.pub.publish(msg)

def main():
    rclpy.init()
    Beacon()
    rclpy.spin(Beacon())

if __name__ == "__main__":
    main()

