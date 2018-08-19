# planetarium_in_hand
Look at the stars on web which you would see looking over the sky.

# requirement
This app must be hosted on the server with ssl support in order to use GPS information inside.

# debug environment caution
When you run the app on local environment for debug purpose and use self-signed certificate, you should not ignore a browser waring such as untrusted certificate. Which may make some features not to work, including app-icon on iphone as far as I have noticed.

When use self-signed certificate, make sure the following things for appropreate work:

(for all browsers)
- Your root certificate is registered in the OS (for safari and chrome on OSX) or in the browser (for firefox on OSX). Consult other pages for how to do it.

(for chrome)
- Your certificate include SubjectAltNames extension with your common name, even if CN is configured.

(for Firefox)
- Your server certificate (which is sent with a respond to the client) is not self-signed
- but your root certificate is self-signed. In other words, your certificate has 2 or higher hierarchy.
- Your root certificate's version is not 1.
- about:config/security.enterprise_roots.enabled is true.
- Your top level domain is not dev, which results in HSTS ([wikipedia](https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&cad=rja&uact=8&ved=2ahUKEwih3IedsfncAhUR6bwKHa7zBY4QFjAAegQIBhAB&url=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FHTTP_Strict_Transport_Security&usg=AOvVaw1fchZaueG6yXEG2yoTKmy1)). For example, `example.dev` and `www.example.dev` is not allowed.

(for iOS)
- Your root certificate's CN is not empty.
