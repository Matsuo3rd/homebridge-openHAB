"use strict";

var request = require("request");
var Promise = require("promise");

var DimmerItem = function (widget, platform, homebridge) {
    DimmerItem.super_.call(this, widget, platform, homebridge);
};

DimmerItem.prototype.getServices = function () {

    this.initListener();

    this.informationService = this.getInformationServices();

    this.otherService = new this.homebridge.hap.Service.Lightbulb();

    this.otherService.getCharacteristic(this.homebridge.hap.Characteristic.On)
        .on('set', this.setOpenHabPowerState.bind(this))
        .on('get', this.getOpenHabPowerState.bind(this))
        .setValue(this.state > 0, function () {}, "init");

    this.otherService.addCharacteristic(this.homebridge.hap.Characteristic.Brightness)
        .on('set', this.setOpenHabBrightnessState.bind(this))
        .on('get', this.getOpenHabBrightnessState.bind(this))
        .setValue(+this.state, function () {}, "init");

    return [this.informationService, this.otherService];
};

DimmerItem.prototype.updateCharacteristics = function (message) {

    var brightness = +message;

    this.otherService.getCharacteristic(this.homebridge.hap.Characteristic.Brightness)
        .setValue(brightness, function () {
        }, "remote");
    this.otherService.getCharacteristic(this.homebridge.hap.Characteristic.On)
        .setValue(brightness > 0, function () {
        }, "remote");

};

DimmerItem.prototype.updateOpenHabState = function (value, type, callback, context) {

    var self = this;

    if (context == "remote" || context == "init") {
        callback(null);
        return;
    }

    if (type === "Power") {

        // ignore the power command if already on
        this.getOpenHabState().then( function (state, currentValue) {

            let command = state ? 'ON' : 'OFF';

            if (state == true && Number(currentValue) > 0) {
                // Ignore the command because the light is already on
                callback()
            }else {

                this.sendCommand(command, callback)
            }

        }.bind(this, value));

    } else {
        let command = String(value);
        this.sendCommand(command, callback)
    }
};

DimmerItem.prototype.sendCommand = function (command, callback){

    this.log.debug("iOS - send message to " + this.name + ": " + command);

    request.post(
        this.url,
        {
            body: command,
            headers: {'Content-Type': 'text/plain'}
        },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                this.log.debug("OpenHAB HTTP - response from " + this.name + ": " + body);
            } else {
                this.log.debug("OpenHAB HTTP - error from " + this.name + ": " + error);
            }
            callback();
        }.bind(this)
    );
}


/**
 * Method to get the OpenHab state. It uses a GET request to retrieve the state from the REST api.
 * The callback method updateValues is called if the GET request succeeded.
 */
DimmerItem.prototype.getOpenHabState = function () {

    return new Promise(function (resolve, reject) {

            request.get(
                this.url + '/state',
                function (error, response, body) {
                    if (!error && response.statusCode === 200) {

                        this.log.debug("OpenHAB HTTP GET <" + this.name + "> - " + body);
                        resolve(body);

                    } else {
                        this.log.error("OpenHAB HTTP ERROR <" + this.name + "> - " + error);
                        reject(error);
                    }
                }.bind(this)
            )
        }.bind(this)
    );
};

DimmerItem.prototype.getOpenHabPowerState = function (callback) {
    this.getOpenHabState()
        .then(function (state) {
            let response = false;

            if (state > 0) {response = true; }
            callback(null, response)
        });
};

DimmerItem.prototype.getOpenHabBrightnessState = function (callback) {
    this.getOpenHabState()
        .then(function (state) {
            callback(null, +state)
        });
};

DimmerItem.prototype.setOpenHabPowerState = function (value, callback, context) {

    if(typeof value == "boolean"){
        this.updateOpenHabState(value, "Power", callback, context);
    } else{
        callback();
    }
};

DimmerItem.prototype.setOpenHabBrightnessState = function (value, callback, context) {
    this.updateOpenHabState(value, "Brightness", callback, context);
};

module.exports = DimmerItem;