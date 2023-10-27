// here goes the decoder source code
//sample payload 0100000400000362f15ee2

/*
0000010c000000630dfe31
0000010d00000e630e057f

{"reset":8.30, "timezone":"America/New_York", "vol_unit":"m3","prox_unit":"m"}

*/
const buffer = Decoder.data.buffer;
const port = Decoder.data.fport;
const session = Decoder.data.session;
const options = Object.assign({ timezone: "UTC", reset: 0}, Decoder.data.options);
const SESSION_EXPIRES = 60 * 20;
if (!session.hasOwnProperty("battery")) {
    session.battery = 100;
}

const ALARM = {
    channel: 500,
    type: DataTypes.TYPE.ALARM,
    unit: DataTypes.UNIT.undefined,
    name: "Alarm"
};

const DOOR = {
    type: DataTypes.TYPE.OPENCLOSED,
    unit: DataTypes.UNIT.undefined,
};

const VALUE = {
    type: DataTypes.TYPE.VALUE_NULL,
    unit: DataTypes.UNIT.NULL,
}

const TIME = {
    type: DataTypes.TYPE.TIME,
    unit: DataTypes.UNIT.MINUTES,
};

const BATTERY = {
    channel: 5,
    type: DataTypes.TYPE.BATTERY,
    unit: DataTypes.UNIT.PERCENT,
    name: "Battery"
};

function sendData(dataType, value, channel, name) {
    let reading = {
        channel: dataType.channel ? dataType.channel : channel,
        type: dataType.type,
        unit: dataType.unit,
        name: dataType.name ? dataType.name : name,
        value: value,
    };
    console.log(reading);
    Decoder.send(reading);
}

function getLastReset(hour) {
    if (hour == 24) {
        hour = 0;
    }

    const [h, m=0] = hour.toString().replace(/\./g, ':').split(':')
        
    const now = new Date();

    // compute offset 
    const utcTime = now.toLocaleString("en-US", { timeZone: "UTC" });
    const localTime = now.toLocaleString("en-US", { timeZone: options.timezone });
    const offset = Date.parse(localTime) - Date.parse(utcTime);

    // get local day
    const fakeTime = now.getTime() - h * 3600000 - m * 60000 + offset;
    const localDay = Math.floor(fakeTime / (24 * 3600000));

    // substract offset to get UTC time from local
    const resetTimestamp = (localDay) * 24 * 3600000 + h * 3600000 + m * 60000 - offset;
    
    console.log({
        utcTime,
        utcResetTime: new Date(resetTimestamp).toLocaleString("en-US", { timeZone: "UTC" }),
        localTime,
        localResetTime: new Date(resetTimestamp).toLocaleString("en-US", { timeZone: options.timezone }),
    });

    return resetTimestamp;
}

function sendDoorStats(open_status){
    const now = Date.now();
    const last_reset = getLastReset(options.reset);
    const last_hour = now - 3600000;

    const last_open_at = session.last_open_at || now;
    const last_open_status = session.last_open_at > 0;
    let open_count = session.open_count || 0;
    let last_open_duration = now - last_open_at;
    
    function getFilter(reset_time) {
        return ({ closed_at }) => closed_at > reset_time;
    }

    function getDuration(reset_time) {
        return (duration, { open_at, closed_at }) => duration + closed_at - Math.max(open_at, reset_time);
    }
    
    if (!session.open_data) {
        session.open_data = [];
    }

    if (!open_status) {
        if (last_open_status) {
            // now closed
            open_count++;
            session.open_data.push({
                open_at: last_open_at,
                closed_at: now,
            });
            session.last_open_at = null;
            session.open_count = open_count;
        }
        else {
            // still closed
            const { open_at=0, closed_at=0 } = session.open_data.slice(-1).pop() || {};
            last_open_duration = closed_at - open_at;
        }
    }

    const last_reset_data = session.open_data.filter(getFilter(last_reset));
    const last_hour_data = session.open_data.filter(getFilter(last_hour));
    
    let daily_count = last_reset_data.length;
    let hourly_count = last_hour_data.length;
    let daily_duration = last_reset_data.reduce(getDuration(last_reset), 0);
    let hourly_duration = last_hour_data.reduce(getDuration(last_hour), 0);
    let daily_critical_count = last_reset_data.filter(({ open_at, closed_at }) => closed_at - open_at >= 60000).length;

    if (open_status) {
        const current_duration = now - last_open_at;

        daily_duration += now - Math.max(last_open_at, last_reset);
        hourly_duration += now - Math.max(last_open_at, last_hour);
        daily_critical_count += (now - Math.max(last_open_at, last_reset) >= 60000) ? 1 : 0;
        daily_count++;
        hourly_count++;
        open_count++;
        
        if (!last_open_status) {
            // now open
            session.last_open_at = now;
        }
        else {
            // still open
        }
    }
    
    sendData(VALUE, open_count, 144, "Door Open Count");
    sendData(VALUE, daily_critical_count, 150, "Last 24Hrs Door Open Count (+1min)");
    sendData(DOOR, daily_critical_count > 0 ? 1 : 0, 151, "Last 24Hrs Door Open for +1min");
    sendData(VALUE, hourly_count, 501, "Last Hour Door Open Count");
    sendData(VALUE, daily_count, 503, "Last 24Hrs Door Open Count");
    sendData(TIME, getFixed(last_open_duration/60000), 168, "Last Open Duration");
    sendData(TIME, getFixed(hourly_duration/60000), 502, "Last Hour Door Open Duration");
    sendData(TIME, getFixed(daily_duration/60000), 504, "Last 24Hrs Door Open Duration");

    session.open_data = last_reset_data;
}

function datalog(i, bytes) {
    var aa = bytes[0 + i] & 0x02 ? "TRUE" : "FALSE";
    var bb = bytes[0 + i] & 0x01 ? "OPEN" : "CLOSE";
    var cc = (
        (bytes[1 + i] << 16) |
        (bytes[2 + i] << 8) |
        bytes[3 + i]
    ).toString(10);
    var dd = (
        (bytes[4 + i] << 16) |
        (bytes[5 + i] << 8) |
        bytes[6 + i]
    ).toString(10);
    var ee = getMyDate(
        (
            (bytes[7 + i] << 24) |
            (bytes[8 + i] << 16) |
            (bytes[9 + i] << 8) |
            bytes[10 + i]
        ).toString(10)
    );
    var string =
        "[" + aa + "," + bb + "," + cc + "," + dd + "," + ee + "]" + ",";

    return string;
}

function getzf(c_num) {
    if (parseInt(c_num) < 10) c_num = "0" + c_num;

    return c_num;
}

function getMyDate(str) {
    var c_Date;
    if (str > 9999999999) c_Date = new Date(parseInt(str));
    else c_Date = new Date(parseInt(str) * 1000);

    var c_Year = c_Date.getFullYear(),
        c_Month = c_Date.getMonth() + 1,
        c_Day = c_Date.getDate(),
        c_Hour = c_Date.getHours(),
        c_Min = c_Date.getMinutes(),
        c_Sen = c_Date.getSeconds();
    var c_Time =
        c_Year +
        "-" +
        getzf(c_Month) +
        "-" +
        getzf(c_Day) +
        " " +
        getzf(c_Hour) +
        ":" +
        getzf(c_Min) +
        ":" +
        getzf(c_Sen);

    return c_Time;
}

function decoder(bytes, port) {
    if (port == 0x02) {
        var alarm = bytes[0] & 0x02 ? 1 : 0;
        var door_open_status = bytes[0] & 0x01 ? 1 : 0;
        var open_times = (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
        var open_duration = (bytes[4] << 16) | (bytes[5] << 8) | bytes[6];
        var data_time = getMyDate(
            (
                (bytes[7] << 24) |
                (bytes[8] << 16) |
                (bytes[9] << 8) |
                bytes[10]
            ).toString(10)
        );
        //console.log(bytes.length);
        if (bytes.length == 11) {
            return {
                ALARM: alarm,
                DOOR_OPEN_STATUS: door_open_status,
                DOOR_OPEN_TIMES: open_times,
                LAST_DOOR_OPEN_DURATION: open_duration,
                TIME: data_time,
            };
        }
    } else if (port == 0x03) {
        for (var i = 0; i < bytes.length; i = i + 11) {
            var data = datalog(i, bytes);
            if (i == "0") data_sum = data;
            else data_sum += data;
        }
        return {
            DATALOG: data_sum,
        };
    } else if (port == 0x04) {
        var tdc = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
        var disalarm = bytes[3] & 0x01;
        var keep_status = bytes[4] & 0x01;
        var keep_time = (bytes[5] << 8) | bytes[6];

        return {
            TDC: tdc,
            DISALARM: disalarm,
            KEEP_STATUS: keep_status,
            KEEP_TIME: keep_time,
        };
    } else if (port == 0x05) {
        var sub_band;
        var freq_band;

        if (bytes[0] == 0x0a) var sensor = "LDS03A";

        if (bytes[4] == 0xff) sub_band = "NULL";
        else sub_band = bytes[4];

        if (bytes[3] == 0x01) freq_band = "EU868";
        else if (bytes[3] == 0x02) freq_band = "US915";
        else if (bytes[3] == 0x03) freq_band = "IN865";
        else if (bytes[3] == 0x04) freq_band = "AU915";
        else if (bytes[3] == 0x05) freq_band = "KZ865";
        else if (bytes[3] == 0x06) freq_band = "RU864";
        else if (bytes[3] == 0x07) freq_band = "AS923";
        else if (bytes[3] == 0x08) freq_band = "AS923_1";
        else if (bytes[3] == 0x09) freq_band = "AS923_2";
        else if (bytes[3] == 0x0a) freq_band = "AS923_3";
        else if (bytes[3] == 0x0b) freq_band = "CN470";
        else if (bytes[3] == 0x0c) freq_band = "EU433";
        else if (bytes[3] == 0x0d) freq_band = "KR920";
        else if (bytes[3] == 0x0e) freq_band = "MA869";

        var firm_ver =
            (bytes[1] & 0x0f) +
            "." +
            ((bytes[2] >> 4) & 0x0f) +
            "." +
            (bytes[2] & 0x0f);
        var bat = ((bytes[5] << 8) | bytes[6]) / 1000;

        return {
            SENSOR_MODEL: sensor,
            FIRMWARE_VERSION: firm_ver,
            FREQUENCY_BAND: freq_band,
            SUB_BAND: sub_band,
            BAT: bat,
        };
    }
}

function getBat(bat) {
    let minValue = 3;
    let range = 0.5;
    let battery = bat - minValue;
    return Number(
        ((Math.min(Math.max(battery, 0), range) / range) * 100).toFixed(2)
    );
}
function getFixed(value, decimal = 2) {
    try {
        return Number(value.toFixed(decimal));
    } catch (error) {}
    return value;
}


if(port == 2){
    const data = decoder(buffer, port);
console.log("data", data)
    if (data.ALARM != null) {
        sendData(ALARM, data.ALARM);
    }
    if (data.DOOR_OPEN_STATUS != null) {
        sendData(DOOR, data.DOOR_OPEN_STATUS, 244, "Door Open Status");
        sendData(DOOR, data.DOOR_OPEN_STATUS, 245, "Door Open Status FP");
        sendData(DOOR, data.DOOR_OPEN_STATUS, 246, "Door Open Status AH");
    }
    sendDoorStats(data.DOOR_OPEN_STATUS);
    sendData(BATTERY, session.battery);
}
else if (port == 5){
    const data = decoder(buffer, port);
console.log("data", data)
    if (data.BAT) {
        session.battery = getBat(data.BAT);
        sendData(BATTERY, session.battery);
    }
}
Decoder.saveSession(session, SESSION_EXPIRES);

Decoder.done();

