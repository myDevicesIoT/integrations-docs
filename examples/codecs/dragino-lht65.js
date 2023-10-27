//Dragino LHT65 Temp & Humidity Sensor 2.0 Codec Used
//Sample data, external DS18B20 sensor: 0B4501050248010105
//Sample data, external soil moisture sensor: 0B49FF3F024802
//Sample data, external tilting sensor: 0B450105024803

"use strict";

const DS18B20_SENSOR = 0x01;
const SOIL_MOISTURE_SENSOR = 0x01;
const TILTING_SENSOR = 0x01;

var buffer = Decoder.data.buffer;
var temperature = 23;

const {probe_offset = 0, internal_offset = 0, offset_unit = 'c', humidity_offset = 0} = Decoder.data.options;

function getTemperatureOffset(offset) {
    const offset_number = Number(offset);
    if (offset_unit == 'c') {
        return offset_number;
    }
    else if (offset_unit == 'f') {
        // we want to solve CtoF(temp) + OFFSET_F = CtoF(temp + OFFSET_C)
        // and compute OFFSET_C based on OFFSET_F provided by setting ...
        // CtoF(x) = x * 1.8 + 32
        // temp * 1.8 + 32 + OFFSET_F = (temp + OFFSET_C) * 1.8 + 32
        // temp * 1.8 + 32 + OFFSET_F = temp * 1.8 + 32 + OFFSET_C * 1.8
        // OFFSET_F = OFFSET_C * 1.8
        // OFFSET_C = OFFSET_F / 1.8
        return offset_number / 1.8;
    }
}

function decodeTemperature(offset, channel, name, temperature_offset = 0) {
    let value = buffer.readInt16BE(offset);
    let tempValue = Number((value / 100).toFixed(2));
    
    /** 
    * @author: Adrian
  * @comment: Do not send probe reading if value is equal to 327
    * @date: 09/04/2019
    */
    if (Math.floor(tempValue) != 327) {
        Decoder.send({
          channel: channel,
          type: DataTypes.TYPE.TEMPERATURE,
          unit: DataTypes.UNIT.CELSIUS,
          value: Number((value / 100).toFixed(2)) + temperature_offset,
          name: name
      });
        //Save the internal temperature
        if (channel == 3) {
            temperature = tempValue;
        }
    }   
      
}
decodeTemperature(2, 3, 'Internal Temp', getTemperatureOffset(internal_offset));
Decoder.send({
    channel: 4,
    type: DataTypes.TYPE.RELATIVE_HUMIDITY,
    unit: DataTypes.UNIT.PERCENT,
    value: Number((buffer.readUInt16BE(4) / 10).toFixed(1)) + humidity_offset,
    name: 'Humidity'
});
var external_sensor = buffer.readUInt8(6);
switch(external_sensor){
    case DS18B20_SENSOR:
        decodeTemperature(7, 7, 'Probe Temp', getTemperatureOffset(probe_offset));
        break
    
    case SOIL_MOISTURE_SENSOR:
        //Format not yet defined
        break
        
    case TILTING_SENSOR:
        //Format not yet defined
        break
}

//Calculate battery percent using trendline from real world temperature/voltage data
let maxValue = 2914 + 6.25 * temperature + -0.0793 * Math.pow(temperature, 2);
if (temperature > 39) {
  maxValue = 3040;
}
if (temperature < -40) {
  maxValue = 2540;
}
console.log(maxValue)
let minValue = 2400;
let range = maxValue - minValue;
let battery = (buffer.readUInt16BE(0) & 0x3FFF) - minValue;
let batteryPercent = Number((Math.min(Math.max(battery, 0), range) / range * 100).toFixed(2));
Decoder.send({
    channel: 5,
    type: DataTypes.TYPE.BATTERY,
    unit: DataTypes.UNIT.PERCENT,
    value: batteryPercent,
    name: 'Battery'
});
console.log("Voltage: " + (buffer.readUInt16BE(0) & 0x3FFF) / 1000);
Decoder.send({
    channel: 500,
    type: DataTypes.TYPE.VOLTAGE,
    unit: DataTypes.UNIT.MILLIVOLTS,
    value: buffer.readUInt16BE(0) & 0x3FFF,
    name: 'Battery Voltage'
});
Decoder.done();
