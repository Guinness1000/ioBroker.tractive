"use strict";

/*
 * Tractive Adapter ==> Template Created with @iobroker/create-adapter v2.1.1
 */

const utils = require("@iobroker/adapter-core");
const axios = require("axios").default;
const ClientID = "5f9be055d8912eb21a4cd7ba";

class Tractive extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "tractive",
		});

		this.tractiveApiClient = null;
		this.UserID = null;
		this.AccessToken = null;
		this.AccessTokenExpires = null;
		this.TrackerID = null;



		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {

		await this.setObjectNotExistsAsync("deviceinfo.TrackerID", {
			"type": "state",
			"common": {
				"role": "text",
				"name": "GPS Tracker ID",
				"type": "string",
				"read": true,
				"write": false,
				"def": ""
			},
			"native": {}
		});

		await this.setObjectNotExistsAsync("deviceinfo.TrackerVersion", {
			"type": "state",
			"common": {
				"role": "text",
				"name": "GPS Tracker Version",
				"type": "string",
				"read": true,
				"write": false,
				"def": ""
			},
			"native": {}
		});

		await this.setObjectNotExistsAsync("deviceinfo.BatteryLevel", {
			"type": "state",
			"common": {
				"role": "value.battery",
				"name": "GPS Tracker Battery Level",
				"type": "number",
				"read": true,
				"write": false,
				"def": 0
			},
			"native": {}
		});

		await this.setObjectNotExistsAsync("deviceinfo.BatteryCharging", {
			"type": "state",
			"common": {
				"role": "text",
				"name": {
					"en": "Battery Charging",
					"de": "Batterieladegerät",
					"ru": "Зарядка батареи",
					"pt": "Carregamento da bateria",
					"nl": "Batterij opladen",
					"fr": "Batterie",
					"it": "Caricamento della batteria",
					"es": "Carga de batería",
					"pl": "Bateria Charging",
					"zh-cn": "包 托"
				},
				"type": "boolean",
				"read": true,
				"write": false,
				"def": false
			},
			"native": {}
		});

		await this.setObjectNotExistsAsync("deviceinfo.BatteryState", {
			"type": "state",
			"common": {
				"role": "text",
				"name": "GPS Tracker Battery State",
				"type": "string",
				"read": true,
				"write": false,
				"def": ""
			},
			"native": {}
		});

		await this.setObjectNotExistsAsync("deviceinfo.DeviceState", {
			"type": "state",
			"common": {
				"role": "text",
				"name": "GPS Tracker Device State",
				"type": "string",
				"read": true,
				"write": false,
				"def": ""
			},
			"native": {}
		});

		await this.setObjectNotExistsAsync("devicelocation.Latitude", {
			"type": "state",
			"common": {
				"role": "value.gps.latitude",
				"name": "Latitude",
				"type": "string",
				"read": true,
				"write": false,
				"def": ""
			},
			"native": {}
		});

		await this.setObjectNotExistsAsync("devicelocation.Longitude", {
			"type": "state",
			"common": {
				"role": "value.gps.longitude",
				"name": "Longitude",
				"type": "string",
				"read": true,
				"write": false,
				"def": ""
			},
			"native": {}
		});

		await this.setObjectNotExistsAsync("devicelocation.SourceType", {
			"type": "state",
			"common": {
				"role": "text",
				"name": "Source Type",
				"type": "string",
				"read": true,
				"write": false,
				"def": ""
			},
			"native": {}
		});

		await this.setObjectNotExistsAsync("devicelocation.Altitude", {
			"type": "state",
			"common": {
				"role": "value.gps.elevation",
				"name": "Altitude",
				"type": "number",
				"read": true,
				"write": false,
				"def": 0
			},
			"native": {}
		});

		await this.setObjectNotExistsAsync("devicelocation.Speed", {
			"type": "state",
			"common": {
				"role": "value.speed",
				"name": "Speed",
				"type": "number",
				"read": true,
				"write": false,
				"def": 0
			},
			"native": {}
		});

		await this.setObjectNotExistsAsync("devicelocation.Accuracy", {
			"type": "state",
			"common": {
				"role": "text",
				"name": "GPS Accuracy",
				"type": "number",
				"read": true,
				"write": false,
				"def": 0
			},
			"native": {}
		});

		await this.setObjectNotExistsAsync("devicelocation.LastUpdate", {
			"type": "state",
			"common": {
				"role": "state",
				"name": "Last Update",
				"type": "string",
				"read": true,
				"write": false,
				"def": ""
			},
			"native": {}
		});

		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our variable we have created above.
		this.subscribeStates("info.*");
		this.subscribeStates("deviceinfo.*");
		this.subscribeStates("devicelocation.*");

		if (!this.config.accountemail) {
			this.log.error("Tractive Account Email not set. Please set it in the properties of the adapter.");
			return;
		}

		if (!this.config.password) {
			this.log.error("Tractive Account Password not set. Please set it in the properties of the adapter.");
			return;
		}

		try {

			this.AccessTokenExpires = await this.getStateAsync("info.TokenExpiry");

			this.log.debug("AccessTokenExpires State: " + this.AccessTokenExpires.val);
			// @ts-ignore
			if (!this.AccessTokenExpires.val > Date.now()) {
				await this.TractiveAuthentication();
				// @ts-ignore
				this.log.debug(this.AccessTokenExpires.val + " vs. " + Date.now());
			} else {
				// @ts-ignore
				this.log.debug(this.AccessTokenExpires.val + " vs. " + Date.now());
				this.UserID = await this.getStateAsync("info.UserID");
				// @ts-ignore
				this.UserID = this.UserID.val;
				this.AccessToken = await this.getStateAsync("info.Token");
				// @ts-ignore
				this.AccessToken = this.AccessToken.val;
				this.log.debug("UserID : " + this.UserID);
				this.log.debug("AccessToken : " + this.AccessToken);
				this.log.debug("AccessToken still valid");
			}

			await this.TractiveGetTracker();

			await this.TractiveGetTrackerInfo();

			await this.TractiveGetTrackerInfo2();

			await this.TractivePosition();

			this.terminate("");

		} catch (err) {
			this.log.error(err);
		}


	}

	/**
	 * Is called for Authentication against tractive API
	 * => Token, TokenExpiry, UserID
	 */
	async TractiveAuthentication() {

		this.log.debug("TractiveAuthentication");

		this.tractiveApiClient = axios.create({
			baseURL: "https://graph.tractive.com/3/auth/token",
			timeout: 1000,
			data: {
				platform_email: this.config.accountemail,
				platform_token: this.config.password,
				grant_type: "tractive"
			},
			headers: {
				"X-Tractive-Client": ClientID,
				"content-type": "application/json;charset=UTF-8",
				"accept": "application/json, text/plain, */*"
			},
		});

		const response = await this.tractiveApiClient.post("/");

		if (response.status === 200) {

			const ResultData = response.data;

			this.UserID = ResultData.user_id;
			this.AccessToken = ResultData.access_token;
			this.AccessTokenExpires = ResultData.expires_at;
			const AccessTokenExpiresAsDate = new Date(ResultData.expires_at * 1000);

			this.log.debug("Account All : " + JSON.stringify(ResultData));
			this.log.debug("UserID : " + this.UserID);
			this.log.debug("AccessToken : " + this.AccessToken);
			this.log.debug("AccessTokenExpires : " + AccessTokenExpiresAsDate.toLocaleDateString("en-GB") + " " + AccessTokenExpiresAsDate.toLocaleTimeString("en-GB"));

			await this.setStateAsync("info.UserID", {val: this.UserID, ack: true});
			await this.setStateAsync("info.Token", {val: this.AccessToken, ack: true});
			await this.setStateAsync("info.TokenExpiry", {val: this.AccessTokenExpires, ack: true});

			return;

		} else {

			this.log.debug("Authentication Status : " + response.status);
			this.disable();
			return;

		}

	}

	/**
	 * Is called to receive TrackerID
	 * => TrackerID
	 */
	async TractiveGetTracker() {

		this.log.debug("TractiveGetTracker");

		this.tractiveApiClient = axios.create({
			baseURL: "https://graph.tractive.com/3/user/" + this.UserID + "/trackers",
			timeout: 1000,
			headers: {
				"X-Tractive-Client": ClientID,
				"content-type": "application/json;charset=UTF-8",
				"accept": "application/json, text/plain, */*",
				"Authorization": "Bearer " + this.AccessToken
			}
		});

		const response = await this.tractiveApiClient.get("/");

		if (response.status === 200) {

			let ResultData = response.data;

			ResultData = JSON.stringify(ResultData).replace("[", "");
			ResultData = ResultData.replace("]", "");
			this.log.debug("Tracker All : " + ResultData);
			//this.log.debug ("Tracker All : " + + JSON.stringify(ResultData));
			ResultData = JSON.parse(ResultData);
			this.TrackerID = ResultData._id;
			this.log.debug("TrackerID : " + this.TrackerID);
			this.setStateAsync("deviceinfo.TrackerID", {val: this.TrackerID, ack: true});

			return;

		} else {

			this.log.debug("Device Status : " + response.status);
			this.disable();

			return;

		}
	}

	/**
	 * Is called to receive TrackerInfo
	 * => BatteryLevel, TrackerVersion
	 */
	async TractiveGetTrackerInfo() {

		this.log.debug("TractiveGetTrackerInfo");

		this.tractiveApiClient = axios.create({
			baseURL: "https://graph.tractive.com/3/device_hw_report/" + this.TrackerID,
			timeout: 1000,
			headers: {
				"X-Tractive-Client": ClientID,
				"content-type": "application/json;charset=UTF-8",
				"accept": "application/json, text/plain, */*",
				"Authorization": "Bearer " + this.AccessToken
			}
		});

		const response = await this.tractiveApiClient.get("/");
		const ResultData = await response.data;

		let BatteryLevel;
		let TrackerVersion;

		if (response.status === 200) {

			BatteryLevel = ResultData.battery_level;
			TrackerVersion = ResultData._version;

			this.log.debug("TrackerInfo All : " + JSON.stringify(ResultData));
			this.log.debug("TrackerBatteryLevel : " + BatteryLevel);
			this.log.debug("TrackerVersion : " + TrackerVersion);

			this.setStateAsync("deviceinfo.BatteryLevel", {val: BatteryLevel, ack: true});
			this.setStateAsync("deviceinfo.TrackerVersion", {val: TrackerVersion, ack: true});

		} else {

			this.log.debug("Device Status : " + response.status);
			this.disable();

		}
	}

	/**
	 * Is called to receive TrackerInfo
	 * => BatteryCharging, BatteryState, DeviceState
	 */
	async TractiveGetTrackerInfo2() {

		this.log.debug("TractiveGetTrackerInfo2");

		this.tractiveApiClient = axios.create({
			baseURL: "https://graph.tractive.com/3/tracker/" + this.TrackerID,
			timeout: 1000,
			headers: {
				"X-Tractive-Client": ClientID,
				"content-type": "application/json;charset=UTF-8",
				"accept": "application/json, text/plain, */*",
				"Authorization": "Bearer " + this.AccessToken
			}
		});

		const response = await this.tractiveApiClient.get("/");
		const ResultData = await response.data;

		let BatteryCharging;
		let BatteryState;
		let DeviceState;

		if (response.status === 200) {

			BatteryState = ResultData.battery_state;

			if (ResultData.charging_state == "NOT_CHARGING") {
				BatteryCharging = false;
			} else if (ResultData.charging_state == "CHARGING") {
				BatteryCharging = true;
			}

			DeviceState = ResultData.state;

			this.log.debug("TrackerState All : " + JSON.stringify(ResultData));
			this.log.debug("TrackerBatteryState : " + BatteryState);
			this.log.debug("TrackerCharging : " + BatteryCharging);
			this.log.debug("TrackerDeviceState : " + DeviceState);

			this.setStateAsync("deviceinfo.BatteryState", {val: BatteryState, ack: true});
			this.setStateAsync("deviceinfo.BatteryCharging", {val: BatteryCharging, ack: true});
			this.setStateAsync("deviceinfo.DeviceState", {val: DeviceState, ack: true});

		} else {

			this.log.debug("Device Status : " + response.status);
			this.disable();
		}
	}

	/**
	 * Is called to receive last TrackerPosition
	 * => Accuracy, LatLong, Altitude, Latitude, Longitude, SourceType, Speed, LastUpdate, SeparatorPosition
	 */
	async TractivePosition() {

		this.log.debug("TractiveGetTrackerPosition");

		this.tractiveApiClient = axios.create({
			baseURL: "https://graph.tractive.com/3/device_pos_report/" + this.TrackerID,
			timeout: 1000,
			headers: {
				"X-Tractive-Client": ClientID,
				"content-type": "application/json;charset=UTF-8",
				"accept": "application/json, text/plain, */*",
				"Authorization": "Bearer " + this.AccessToken
			}
		});

		const response = await this.tractiveApiClient.get("/");
		const ResultData = await response.data;

		let Accuracy;
		let LatLong;
		let Altitude;
		let Latitude;
		let Longitude;
		let SourceType;
		let Speed;
		let LastUpdate;
		let SeparatorPosition;
		let LastUpdateStored;

		if (response.status === 200) {

			Accuracy = ResultData.pos_uncertainty;
			LatLong = JSON.stringify(ResultData.latlong);
			SeparatorPosition = LatLong.search(",");
			Altitude = ResultData.altitude;
			Latitude = LatLong.substring(1, SeparatorPosition - 1);
			Longitude = LatLong.substring(SeparatorPosition + 1, LatLong.length - 1);
			SourceType = ResultData.sensor_used;
			Speed = ResultData.speed;

			LastUpdate = new Date(ResultData.time * 1000).toISOString();

			this.log.debug("Position All : " + JSON.stringify(ResultData));
			this.log.debug("Accuracy : " + Accuracy);
			this.log.debug("Altitude : " + Altitude);
			this.log.debug("Latitude : " + Latitude);
			this.log.debug("Longitude : " + Longitude);
			this.log.debug("SourceType : " + SourceType);
			this.log.debug("Speed : " + Speed);
			this.log.debug("LastUpdate : " + LastUpdate);

			LastUpdateStored = await this.getStateAsync("devicelocation.LastUpdate");
			// @ts-ignore
			this.log.debug("LastUpdateStored: " + LastUpdateStored.val);

			// @ts-ignore
			if (LastUpdateStored.val == LastUpdate) {
				this.log.debug("LastUpdate : No new data");
			} else {
				this.setStateAsync("devicelocation.Accuracy", {val: Accuracy, ack: true});
				this.setStateAsync("devicelocation.Altitude", {val: Altitude, ack: true});
				this.setStateAsync("devicelocation.Latitude", {val: Latitude, ack: true});
				this.setStateAsync("devicelocation.Longitude", {val: Longitude, ack: true});
				this.setStateAsync("devicelocation.SourceType", {val: SourceType, ack: true});
				this.setStateAsync("devicelocation.Speed", {val: Speed, ack: true});
				this.setStateAsync("devicelocation.LastUpdate", {val: LastUpdate, ack: true});
			}

		} else {

			this.log.debug("DeviceLocation Status : " + response.status);
			this.disable();

		}

	}


	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Tractive(options);
} else {
	// otherwise start the instance directly
	new Tractive();
}