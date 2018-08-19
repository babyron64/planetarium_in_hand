# planetarium_in_hand
Look at the stars on web which you would see looking over the sky.

# requirement
This app must be hosted on the server with ssl support in order to use GPS information inside.

# debug environment notion
When you run the app on local environment for debug purpose and use self-signed certificate, you should not ignore a browser waring such as untrusted certificate. Which may make some features not to work, including app-icon on iphone as far as I have noticed.

When use self-signed certificate, make sure the following things for appropreate work:

(for all browsers)
- Your root certificate is registered in the OS (for safari and chrome on OSX) or in the browser (for firefox on OSX). Consult other pages for how to do it.

(for chrome)
- Your certificate include SubjectAltNames extension with your common name, even if CN is configured.

(for firefox)
- Your server certificate (which is sent with respond to a client) is not self-signed
- but your root certificate is self-signed. In other words, your certificate has 2 or higher hierarchy.
- Your root certificate's version is not 1.
- about:config/security.enterprise_roots.enabled is true.

(for iOS)
- Your root certificate's CN not empty.
