# entityos-learn-push

Example app that pushes messages to a user.

Based on notes @
https://learn.entityos.cloud/learn-function-automation

Supports;
- site context; so can one instance of an app on say AWS lambda can support multiple triggers.
- factory; factories that are in context of the site.

Flow;

1. Get users
2. Get data
3. Create the push notification - ie email message
4. Send the message to users

---

