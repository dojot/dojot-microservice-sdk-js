# Service State Manager

A sample usage of Service State Manager. To simplify the test, you can use the Docker Compose file
provided with the example. It also provides a volume in the `app` directory, so you can change the
code and run without rebuilding the image.

To run the example:
```shell
docker-compose up
```

## Overview

This example starts an HTTP server using Express and shuts it down after some time. In the meantime,
you can do requests to `/hello`, for a simple test, or to `/long`, to simulate a long job running in
the endpoint. The latter will block the server from stopping until the job is done, to demonstrate
the usage of [lightship beacons](https://github.com/gajus/lightship/#beacons).

You can also change which type of health checking you want to do: using the worker thread or doing
it all in the master thread.

__ATTENTION__: there is a problem when using `node rdkafka` library in the worker threads. Even if
you don't use it in the worker thread, it is imported with the SDK module, crashing the worker, so
it can't be used **by now**.
