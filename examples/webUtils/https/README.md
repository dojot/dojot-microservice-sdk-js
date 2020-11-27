# **HTTPS Web Server**

There are two examples that demonstrate the creation of an HTTPS server, one of
them creates a server and a client where only the server is the one who presents
the certificate to establish the TLS. The other example creates a server and two
clients where they all have certificates issued by different CAs, each must
trust the CAs of the others.
In the two examples we can see that the HTTPS server is created correctly.

- [Mutual TLS between clients and server](./mutual-tls)
- [TLS where only the server is authenticated](./simple-tls)
