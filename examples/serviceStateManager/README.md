# Service State Manager

A sample usage of Service State Manager. To simplify the test, you can use the Docker Compose file
provided with the example. It also provides a volume in the `app` directory, so you can change the
code and run without rebuilding the image.

To run the example:
```shell
docker-compose up
```

# Overview

This example starts an HTTP server using Express and shuts it down after some time. In the meantime,
you can do requests to `/hello`, for a simple test, or to `/long`, to simulate a long job running in
the endpoint. The latter will block the server from stopping until the job is done, to demonstrate
the usage of [lightship beacons](https://github.com/gajus/lightship/#beacons).

## Changing health check type

In this example, we show how to change the healthiness of a service via two different (but
equivalent) ways. To toggle between each mode, change the `ENABLE_EVENT_BASED_HEALTH_CHECK`
environment variable in the `docker-compose.yml` file.
