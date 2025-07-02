# Robot Interface for Monitoring and Operation for mobile robots

:warning: If you are here to take part in the evaluation, please refer to [user_tests.md](user_tests.md) for detailed instructions.

This ui aims to offer a graphical interface for mobile robots to fully monitor and control them ...

## Description

What it does, frontend ui and backend with rosbridge but not necessarily ros2 dependency

## Getting Started

### Dependencies

* docker with the compose plugin

### Installing

* Clone the project

### Executing program

Start it up with `docker compose up --build`.
This will start all the separate docker containers for the ui frontend, the backend database and the rosbridge.
Optional the simulation environment (hidden, how to do this?)

### Configuration

Start with or without simulation.
ROS2?

### Settings (todo)

| **Setting** | **Explanation** |
| ---------- | ---------- |
| **General Settings** |
| sound | for notifications |
| **Monitoring** ||
| None | No specific settings yet |
| **Visualization** ||
| ttl                | Time to live for the messages until they are considered stale   |
| layout             | Dropdown menu for selecting saved layouts                         |
| **Manual Control** ||
| linear speed | Adjust the linear speed of the robot |
| angular speed | Adjust the angular speed of the robot |
| **Navigation** ||
| request timeout | Timeout duration until aborting an action request |

## Help/Troubleshooting

Maybe reload the docker image for the rosbridge if the container doesn't start because of invalid package repository keys.

## Authors

[Nils Friedrich](mailto:nils-jonathan.friedrich@informatik.tu-freiberg.de)

## Version History

* 0.1
    * Initial Release
