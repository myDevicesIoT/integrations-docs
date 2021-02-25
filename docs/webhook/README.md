## Webhooks

The Webhook Integration allows you to receive notification callbacks triggered by updates within your IoT in a Box data, alerts and information.

Note: This integration provides both sensor (uplink), gateway(keepalive), and alert events.

- Creating a new Webhook
- Verifying things are working
- Example payloads

### Creating a new Webhook
Use the following steps to setup your new webhook on the IoT in a Box side.

1. Log into your account on the **IoT in a Box portal** or using the mobile app.
2. Select the **Integrations** option and then select the **Webhook** integration.
3. Enter the following information to complete the integration:
    - **Name**: Enter a name for this integration. In case you have multiple integrations, this will help uniquely identify it in the list.
    - **Url**: Enter the URL that you would like to be called in response to IoT in a Box updates.
    - **Headers** (optional): Enter headers values in query string format, for example: 
      ```
      X-Api: secret-key
      Authorization: Token 
      ```
      will need to be input like this: `x-api=my-secret-key&authorization=Token`

After saving the Integration, you will see it shown in your list of integrations.

- You can then edit the integration to make any changes needed.
- You can also toggle the Integration on/off at any time from here as well. Disabling the integration will stop new data from being sent to the webhook.

### Verifying things are working

You can verify the integration is working by waiting for a new IoT in a Box event (or manually triggering on the device or within the dashboard). As soon as a new event occurs, the webhook will be notified and include the event payload.

You can also use a temporary service, such as [RequestBin](https://requestvin.herokuapp.com/) to get a sense of how things work before integrating payload events into your service.

### JSON Schema
- [Uplink JSON Schema](https://github.com/myDevicesIoT/integrations-docs/blob/master/docs/webhook/schema/uplink-schema.json)
- [Alert JSON Schema](https://github.com/myDevicesIoT/integrations-docs/blob/master/docs/webhook/schema/alert-schema.json)

### Example Payloads

 #### Uplink Event:
  - [Netvox Wireless Temp/Humidity](https://github.com/myDevicesIoT/integrations-docs/blob/master/docs/webhook/uplink-sample.json)
 #### Alert Event:
  - [Netvox Leak](https://github.com/myDevicesIoT/integrations-docs/blob/master/docs/webhook/alert-sample.json)