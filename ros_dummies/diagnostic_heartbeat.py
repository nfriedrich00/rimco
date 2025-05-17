#!/usr/bin/env python3
"""
Publishes fake DiagnosticStatus messages so the Monitoring panel has data.
"""
import rclpy
from rclpy.node import Node
from diagnostic_msgs.msg import DiagnosticStatus, KeyValue
from std_msgs.msg import Header
from random import random

COMPONENTS = ["Livox-Front", "Livox-Rear", "GNSS", "Localization"]

class Heartbeat(Node):
    def __init__(self):
        super().__init__("diagnostic_heartbeat")
        self.pub = self.create_publisher(DiagnosticStatus, "/monitoring", 10)
        self.timer = self.create_timer(0.5, self.tick)

    def tick(self):
        for comp in COMPONENTS:
            msg = DiagnosticStatus()
            msg.name = comp
            msg.level = DiagnosticStatus.OK if random() > 0.2 else DiagnosticStatus.ERROR
            msg.message = "OK" if msg.level == DiagnosticStatus.OK else "Error"
            msg.values = [KeyValue(key="frequency", value=str(round(2 + random(), 1)))]
            self.pub.publish(msg)

rclpy.init()
Heartbeat()
rclpy.spin(Heartbeat())

