# Basic Consumer (Async Commit)

This example implements a [basic consumer](sample.js) which registers a single callback to log messages published to a specific topic in an asynchronous way. The consumer uses the asynchronous commit mechanism.

It is also provided a [Docker Compose file](docker-compose.yml) with the whole environment to see the consumer in action, including a service that publishes messages to kafka every 5 seconds.

To run this example, type:

```sh
docker-compose up
```
