# **Backend web utils**

The "web" module contains tools for creating a server and web framework
(Express.js) to handle HTTP(S) requests.

This module provides functions capable of deciding, for example, whether to
create an HTTP or HTTPS server according to the informed configuration, as well
as instantiating and configuring the Express framework in a standardized way.
The advantage of this approach is to concentrate on a single point what is
common between services that communicate using a REST interface.

See the [examples directory](../../examples/web) on how to use the utilities in this module.
