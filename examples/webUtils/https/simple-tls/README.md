# **Simple TLS example**

In this example we can see that the server is the only one that has a
certificate. In this scenario, the server is unable to authenticate the client
through a certificate, but TLS is established because the client is the one who
always initiates the connection. This type of TLS connection is very common on
web sites and for the server to authenticate the client, other mechanisms are
needed for this.

To run the example:
```shell
docker-compose up
```
