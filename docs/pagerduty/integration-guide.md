# PagerDuty + myDevices Integration Benefits

* Notify on-call responders based on alerts sent from myDevices.
* Create high and low urgency incidents based on the severity of the event from the myDevices event payload.

# How it Works
* myDevices metrics that fall outside of a designated range will send an event to a service in PagerDuty. Events from myDevices will trigger a new incident on the corresponding PagerDuty service, or group as alerts into an existing incident.

# Requirements
* PagerDuty integrations require an Admin base role for account authorization. If you do not have this role, please reach out to an Admin or Account Owner within your organization to configure the integration.

# Support

If you need help with this integration, please contact support@iotinabox.com

# Integration Walkthrough
## In PagerDuty

### Integrating With a PagerDuty Service
1. From the **Configuration** menu, select **Services**.
![](https://res.cloudinary.com/dctlrnwuz/image/upload/v1583797753/iotinabox/pagerduty-i9n-guide.png)
2. There are two ways to add an integration to a service:
   * **If you are adding your integration to an existing service**: Click the **name** of the service you want to add the integration to. Then, select the **Integrations** tab and click the **New Integration** button.
   * **If you are creating a new service for your integration**: Please read our documentation in section [Configuring Services and Integrations](https://support.pagerduty.com/docs/services-and-integrations#section-configuring-services-and-integrations) and follow the steps outlined in the [Create a New Service](https://support.pagerduty.com/docs/services-and-integrations#section-create-a-new-service) section, selecting myDevices as the **Integration Type** in step 4. Continue with the In  myDevices  section (below) once you have finished these steps.
3. Enter an **Integration Name** in the format `iot-datacenter-monitoring` (e.g.  myDevices-IoT-Datacenter) and select  myDevices  from the Integration Type menu.
4. Click the **Add Integration** button to save your new integration. You will be redirected to the Integrations tab for your service.
5. An **Integration Key** will be generated on this screen. Keep this key saved in a safe place, as it will be used when you configure the integration with  myDevices  in the next section.
![](https://res.cloudinary.com/dctlrnwuz/image/upload/v1583797074/iotinabox/pagerduty-service-i9n-image.png)

## In myDevices

1. Login to [IoT in Box](https://iotinabox.mydevices.com) and go to **Integrations**. From the list of integrations select PagerDuty.
2. Fill in the settings fields to connect the integration to PagerDuty.
   * Integration Key: Enter the key created earlier.
   * Severity: Enter the severity for incidents created by alert events.
      * Severity options: error, warning, or info.

   ![](https://iotinabox.zendesk.com/hc/article_attachments/360060048714/PagerDuty2b.png)
3. After saving the Integration, you will see it shown in your list of integrations.
   * You can then edit the integration to make any changes needed.
   * You can also toggle the Integration on/off at any time from here as well. 
   * Disabling the integration will stop new data from being sent to PagerDuty.


# How to Uninstall

1. In the mydevices portal go to **My Integrations** and edit the PagerDuty integration
2. Click the **Delete** button to unistall integration. 
