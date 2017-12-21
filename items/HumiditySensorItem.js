"use strict";

var request = require("request");

var HumiditySensorItem = function(widget,platform,homebridge) {
    HumiditySensorItem.super_.call(this, widget,platform,homebridge);
};

HumiditySensorItem.prototype.getOtherServices = function() {
    var otherService = new this.homebridge.hap.Service.HumiditySensor();

    otherService.getCharacteristic(this.homebridge.hap.Characteristic.CurrentRelativeHumidity)
        .on('get', this.getItemState.bind(this))
        .setValue(this.checkItemState(this.state));

    return otherService;
};

HumiditySensorItem.prototype.checkItemState = function(state) {
    if ('Unitialized' === state){
        return 0.0;
    }
    return +state;
};


HumiditySensorItem.prototype.updateCharacteristics = function(message) {
    this.otherService
        .getCharacteristic(this.homebridge.hap.Characteristic.CurrentRelativeHumidity)
        .setValue(this.checkItemState(message));
};

HumiditySensorItem.prototype.getItemState = function(callback) {

    var self = this;

    this.log.debug("iOS - request power state from " + this.name);
    request(this.url + '/state?type=json', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            self.log.debug("OpenHAB HTTP - response from " + self.name + ": " + body);
            callback(undefined,self.checkItemState(body));
        } else {
            self.log.error("OpenHAB HTTP - error from " + self.name + ": " + error);
        }
    })
};

module.exports = HumiditySensorItem;
