/*
* Global Privacy Control (GPC) is a way for users to signal that they don't want
* to be tracked. GPC follows a deprecated but still used Do Not Support (DNT)
* header.
*
* This utility can check for either the GPC or DNT signals, can set a body class
* and makes available a userAgentSignal function to use when setting analytics.
* Minimum to enable support with initAll or directly:
  window.GOVUKFrontend.initAll({"experimental_gpc_support": true})
  window.GOVUKFrontend.GlobalPrivacyControl.init({
    "experimental_gpc_support": true
  })
*/

var GlobalPrivacyControl = {
  support: false,
  alterBodyClass: true,
  bodyClassPrefix: "global-privacy-control_signal-",
  includeDNTSupport: false,
  cookieName: '_globalPrivacyControl',
  dntCookieName: '_doNotTrack',

  init: function (options) {
    /*
     * Defaults:
       {
         "experimental_gpc_support": false,
         "experimental_gpc_alterBodyClass": true,
         "experimental_gpc_bodyClassPrefix": "global-privacy-control_signal-",
         "experimental_gpc_includeDNTSupport": false,
         "experimental_gpc_cookieNameOverride": "_globalPrivacyControl",
         "experimental_gpc_DNTCookieNameOverride": "_doNotTrack"
       }
    */

    if (typeof options !== 'undefined') {
      if (typeof options.experimental_gpc_support !== 'undefined') {
        this.support = options.experimental_gpc_support
      }
      if (typeof options.experimental_gpc_alterBodyClass !== 'undefined') {
        this.alterBodyClass = options.experimental_gpc_alterBodyClass
      }
      if (typeof options.experimental_gpc_bodyClassPrefix !== 'undefined') {
        this.bodyClassPrefix = options.experimental_gpc_bodyClassPrefix
      }
      if (typeof options.experimental_gpc_includeDNTSupport !== 'undefined') {
        this.includeDNTSupport = options.experimental_gpc_includeDNTSupport
      }
      if (typeof options.experimental_gpc_cookieNameOverride !== 'undefined') {
        this.cookieName = options.experimental_gpc_cookieNameOverride
      }
      if (typeof options.experimental_gpc_DNTCookieNameOverride !== 'undefined') {
        this.dntCookieName = options.experimental_gpc_DNTCookieNameOverride
      }
    }

    this.refreshBodyClass()
    return this
  },

  refreshBodyClass: function () {
    /*
     * Sets a body class based on the user agent signal
     * Either:
     * - globalPrivacyControl_signal-true (user has turned on global privacy control)
     * - globalPrivacyControl_signal-false (default or user has turned off setting)
     */
    if (!this.support || !this.alterBodyClass) {
      return
    }
    var userAgentSignal = this.userAgentSignal()
    // Try and replace the opposite class in case it's been set but the user
    // changed their user agent settings, if failed (opposite didn't exist)
    // then add the class
    if (!document.body.classList.replace(
        this.bodyClassPrefix+!userAgentSignal,
        this.bodyClassPrefix+userAgentSignal
      )) {
      document.body.classList.add(this.bodyClassPrefix+userAgentSignal)
    }
  },

  userAgentSignal: function () {
    /*
     * userAgentSignal returns a boolean, where true means a user has turned
     * on a user agent setting saying they don't want to be tracked
     *
     * First checks for a navigator value and then a custom cookie (where a
     * user agent sets the header but not the "navigator", a proxy or similar
     * is needed to create a cookie for JavaScript to be able to read value)
     */

    if (this.support) {
      if (typeof navigator.globalPrivacyControl !== 'undefined') {
        return navigator.globalPrivacyControl
      }
      else if (_cookieValue(this.cookieName) !== null) {
        return _cookieStringToBool(this.cookieName)
      }
    }

    if (this.includeDNTSupport) {
      if (typeof navigator.doNotTrack !== 'undefined') {
        return _stringToBool(navigator.doNotTrack)
      }
      else if (_cookieValue(this.dntCookieName) !== null) {
        return _cookieStringToBool(this.dntCookieName)
      }
    }

    return false
  }
}

function _stringToBool(s) {
  // Checks for case insensitive "true" or "1" or "on"
  // and ignores surrounding spaces.
  var boolRegexTest = /^\s*(true|1|on)\s*$/i
  return boolRegexTest.test(s)
}

function _cookieValue(cookie_name) {
  // Gets a cookie's value
  var splitCookie = document.cookie.split(";")
  for (var i = 0; i < splitCookie.length; i++) {
    var cookiePair = splitCookie[i].split("=")
    if (cookiePair[0].trim() === cookie_name) {
      return cookiePair[1].trim()
    }
  }
  return null
}

function _cookieStringToBool(cookie_name) {
  // Gets a cookie's value and converts to a boolean.
  // If cookie doesn't exist, will return false
  return _stringToBool(_cookieValue(cookie_name))
}

export default GlobalPrivacyControl
