/**
 * jQuery.popover plugin v2.0.0b
 * By Davey IJzermans
 * http://daveyijzermans.nl/
 * 
 * Released under MIT License.
 */

(function ($) {
	"use strict";

	var popovers = $();

	/**
	 * Default plugin options
	 * 
	 * @type {Object}
	 */
	var defaults = {
		title: false, // Title for popover, false for none
		content: false, // Content of the popover, false for none
		url: false, // Set to an URL to load content with AJAX automatically
		method: 'POST', // Set AJAX method
		ajaxData: {}, // Additional AJAX data object
		ajaxAsJSON: false, // Setting this to true leads to the response of the AJAX call being parsed as JSON and being used to fill the markup set below. Refer to documentation for more information
		titleFillMethod: 'plain', // Set to something other than 'plain' to use that JSON-property as title
		contentFillMethod: 'plain', // Set to something other than 'plain' to use that JSON-property as content
		loadImmediately: false, // Set to true to load AJAX content on initializing the popover. When set to false, the content will be loaded when the popover is first shown.
		cache: true, // Cache AJAX responses
		markup: '<div class="popover"><div class="arrow"></div><div class="wrap"><div class="title"></div><div class="content"></div></div></div>', // Custom HTML markup
		classes: false, // Specify CSS classes to add to popover on initialization
		position: 'bottom', // Position of the popover
		anchorPosition: 'bottom', // Use this to determine where the anchor point is. You can also set this to an absolute position (i.e. { top: 4, left: 4 }, relative to document body)
		trigger: 'clicktouch', // Set the popover trigger method: 'clicktouch', 'click', 'touch', 'hover' or 'manual'
		preventDefault: true, // Call event.preventDefault() when triggering anchor element (element on which the popover is initialized)
		stopChildrenPropagation: true, // Prevent propagation on popover children
		hideOnHTMLClick: true, // Hides the popover when clicked outside of it
		autoReposition: true, // Automatically reposition popover so it fits best on screen
		anchor: false, // Anchor the popover to a different element, but keep the trigger on the selected element(s)
		showSpeed: 0,
		hideSpeed: 160
	};
	/**
	 * Internal settings
	 * 
	 * @type {Object}
	 */
	var s = {
		plugin_name: 'jQuery.popover',
		data_identifier: 'jquery.popover',
		trigger_namespace: 'popoverTrigger'
	};
	/**
	 * Private methods
	 * 
	 * @type {Object}
	 */
	var priv = {
		setData: function(data) {
			return this.each(function() {
				var $element = $(this);
				$element.data(s['data_identifier'], data);
			});
		}
	};
	/**
	 * This 'factory' allows for easier making of methods by providing default variables
	 * and structures.
	 *
	 * return factory.call(this, function($element, data, options, $popover, $anchor, $document, $window) {
	 *   // code
	 * });
	 *
	 * will become a this.each() statement. In this statement, all variables in the closure will already be available
	 * without the need to define them every single time.
	 * 
	 * @param  string tpl  Template name to use (stdSingle: a single element, stdSingleData: a single element with data, stdEach: stdSingle wrapped in an each() call, stdEachData: stdSingleData wrapped in an each() call)
	 * @param  function code Code to executed. Gets called the defined variables.
	 * @return mixed
	 */
	var factory = function(tpl, code) {
		if (typeof tpl == 'function') {
			code = tpl;
			tpl = 'default';
		}

		switch (tpl) {
			case 'stdSingle':
				var $element = $(this);
				return code.call(this, $element);
			case 'stdSingleData':
				return factory.call(this, 'stdSingle', function($element) {
					var data = $element.popover('getData');

					if ( ! data) {
						$.error('[' + s['plugin_name'] + '] No popover initialized on this element!');
						return false;
					}

					var options = data.options;
					var $popover = data.popover;
					var $anchor = (options.anchor instanceof jQuery ? options.anchor : $element);
					var $document = $(document);
					var $window = $(window);

					return code.call(this, $element, data, options, $popover, $anchor, $document, $window);
				});
			case 'stdEach':
				return this.each(function() {
					return factory.call(this, 'stdSingle', function($element) {
						return code.apply(this, arguments);
					});
				});
			default:
				return this.each(function() {
					return factory.call(this, 'stdSingleData', function($element, data, options, $popover, $anchor, $document, $window) {
						return code.apply(this, arguments);
					});
				});
		}
	};
	/**
	 * Plugin methods
	 * 
	 * @type {Object}
	 */
	var methods = {
		/**
		 * Initialization method.
		 * Constructs elements, constructs data, attaches popover, sets data and options,
		 * updates the markup and binds events.
		 * 
		 * @param {Object}
		 * @return jQuery
		 */
		init: function(params) {
			return factory.call(this, 'stdEach', function($element) {
				// Get data with getData method, and check if there is popover data.
				var data = $element.popover('getData');

				if (data) {
					$.error('[' + s['plugin_name'] + '] Popover already initialized on this element!');
					return false;
				}

				// If not, construct the options for this particular popover
				var options = $.extend({}, defaults, params);

				// Instantiate markup into a working element and find elements that
				// contain the title and content.
				var popoverHTML = $(options['markup']);
				var titleElement = $('.title', popoverHTML);
				var contentElement = $('.content', popoverHTML);
				var arrowElement = $('.arrow', popoverHTML);

				// Add specified classes
				if (options.classes) {
					popoverHTML.addClass(options.classes);
				}

				// Hide the popover
				popoverHTML.hide();
				
				// Attach the popover to the body
				var popoverAttached = popoverHTML.appendTo('body');

				// Make a new data object and fill it according to the defaults.
				data = {
					options: {},
					popover: popoverAttached,
					titleElement: titleElement,
					contentElement: contentElement,
					arrowElement: arrowElement,
					updateNeeded: false, // if the view needs updating
					isAjaxPopover: (options.url !== false),
					ajaxFetchNeeded: (options.url !== false), // if data needs to be reloaded via AJAX
					ajaxFetchCued: options.loadImmediately === true
				};
				priv.setData.call($element, data);

				popovers = popovers.add($element); // add to popovers array for reference

				// Trigger the 'popoverCreated' event for custom callbacks
				$element.trigger('popoverCreated.' + s['trigger_namespace']);

				// Set the actual options and update the 
				$element.popover('setOptions', options).popover('update');
			});
		},
		/**
		 * Updates the popover content
		 * 
		 * @return jQuery
		 */
		updateView: function() {
			return factory.call(this, function($element, data, options) {
				// Set the title and content
				data.titleElement.html(options.title);
				data.contentElement.html(options.content);
				data.updateNeeded = false;

				priv.setData.call($element, data);
			});
		},

		updatePosition: function() {
			return factory.call(this, function($element, data, options, $popover, $anchor, $document, $window) {
				// Start with all position properties on auto
				// We can than use $.extend to change the appropriate properties
				var css = {
					top: 'auto',
					right: 'auto',
					bottom: 'auto',
					left: 'auto'
				}

				var absolutePosition = false;
				if (typeof options.anchorPosition == "object") {
					// Absolute position given.
					$.extend(css, options.anchorPosition);
					absolutePosition = true;
				} else {
					var window_width = $window.outerWidth();
					var window_height = $window.outerHeight();

					// Determine the anchor point
					var anchor_width = $anchor.outerWidth();
					var anchor_height = $anchor.outerHeight();
					var anchor_offset = $anchor.offset();

					// Calculate possible anchor points of popover
					var anchor_points = {
						'top-left': {
							top: anchor_offset.top,
							left: anchor_offset.left
						},
						'top-center': {
							top: anchor_offset.top,
							left: anchor_offset.left + anchor_width / 2
						},
						'top-right': {
							top: anchor_offset.top,
							left: anchor_offset.left + anchor_width
						},
						'middle-left': {
							top: anchor_offset.top + anchor_height / 2,
							left: anchor_offset.left
						},
						'middle-center': {
							top: anchor_offset.top + anchor_height / 2,
							left: anchor_offset.left + anchor_width / 2
						},
						'middle-right': {
							top: anchor_offset.top + anchor_height / 2,
							left: anchor_offset.left + anchor_width
						},
						'bottom-left': {
							top: anchor_offset.top + anchor_height,
							left: anchor_offset.left
						},
						'bottom-center': {
							top: anchor_offset.top + anchor_height,
							left: anchor_offset.left + anchor_width / 2
						},
						'bottom-right': {
							top: anchor_offset.top + anchor_height,
							left: anchor_offset.left + anchor_width
						}
					};

					// Map all kinds of position names to the above cases.
					var tmpAlternatives = {
						'topleft': 'top-left',
						'topcenter': 'top-center',
						'topright': 'top-right',
						'middleleft': 'middle-left',
						'middlecenter': 'middle-center',
						'middleright': 'middle-right',
						'bottomleft': 'bottom-left',
						'bottomcenter': 'bottom-center',
						'bottomright': 'bottom-right',
						'top': 'top-center',
						'middle': 'middle-center',
						'center': 'middle-center',
						'bottom': 'bottom-center',
						'north': 'top-center',
						'northeast': 'top-right',
						'north-east': 'top-right',
						'east': 'middle-right',
						'southeast': 'bottom-right',
						'south-east': 'bottom-right',
						'south': 'bottom-center',
						'southwest': 'bottom-left',
						'south-west': 'bottom-left',
						'west': 'middle-left',
						'northwest': 'top-left',
						'north-west': 'top-left'
					};
					// If the position matches any of the above aliases,
					// set the anchorPositions to the 'real' positions
					if (tmpAlternatives[options.anchorPosition]) {
						options.anchorPosition = tmpAlternatives[options.anchorPosition];
					}

					// Check if the given position exists in the list on calculated
					// positions and if so, apply it's CSS. Else error out.
					if (anchor_points[options.anchorPosition]) {
						$.extend(css, anchor_points[options.anchorPosition]);
					} else {
						$.error('[' + s['plugin_name'] + '] Invalid position!');
						return false;
					}
				}

				$popover.removeClass('popover-top popover-middle popover-bottom popover-left popover-center popover-right');
				$popover.css(css); // apply the CSS

				if ( ! absolutePosition) {
					// Apply appropriate classes for styling the popover.
					var tmpPosSplit = options.anchorPosition.split('-');
					$popover.addClass('popover-' + tmpPosSplit[0] + ' popover-' + tmpPosSplit[1]);
				}
			});
		},

		updateBindings: function() {
			return factory.call(this, function($element, data, options, $popover, $anchor, $document, $window) {
				var $elementAndPopover = $element.add($popover);

				var activationMethods = {
					show: function(event) {
						$element.stop(true, true).popover('show');
						if (options.preventDefault) {
							event.preventDefault();
						}
					},
					hide: function(event) {
						$element.stop(true, true).popover('hide');
						if (options.preventDefault) {
							event.preventDefault();
						}
					}
				}

				// Define methods for different triggers. These methods should bind events
				// in the .popoverTrigger namespace
				var triggerMethods = {
					click: function() {
						$element.on('click.' + s['trigger_namespace'], activationMethods.show);
					},
					touch: function() {
						$element.on('touchstart.' + s['trigger_namespace'], activationMethods.show);
					},
					clicktouch: function() {
						if (typeof Modernizr == "object") {
							if (Modernizr.touch) {
								this.touch();
							} else {
								this.click();
							}
						} else {
							this.click();
						}
					},
					hover: function() {
						$element.on('mouseenter.' + s['trigger_namespace'], activationMethods.show);
						$elementAndPopover.on('mouseleave.' + s['trigger_namespace'], function(event) {
							if (options.preventDefault) {
								event.preventDefault();
							}
							$element.stop(true, true).delay(20).queue(function() {
								$(this).popover('hide');
							});
						});
						$popover.on('mousemove.' + s['trigger_namespace'], activationMethods.show);
					},
					manual: function() {}
				};

				$elementAndPopover.add('body').off('.' + s['trigger_namespace']);

				if (options.stopChildrenPropagation) {
					$popover.on('click.' + s['trigger_namespace'], '*', function(event) {
						event.stopPropagation;
					});
				}

				// Hide the popover when clicked outside of it
				if (options.hideOnHTMLClick) {
					//$('body').on('click.' + s['trigger_namespace'], activationMethods.hide);
				}

				if (options.autoReposition) {
					$(window).on('scroll.' + s['trigger_namespace'] + ' resize.' + s['trigger_namespace'], function() {
						$element.popover('updatePosition');
					});
				}

				if (triggerMethods[options.trigger]) {
					triggerMethods[options.trigger]();
				} else {
					$.error('[' + s['plugin_name'] + '] Invalid trigger!');
					return false;
				}
			});
		},

		fetchAndUpdate: function() {
			return factory.call(this, function($element, data, options) {
				if ( ! data.isAjaxPopover) {
					$.error('[' + s['plugin_name'] + '] Not an AJAX popover!');
					return false;
				}

				if ( ! options.url) {
					$.error('[' + s['plugin_name'] + '] No URL set on this popover!');
					return false;
				}

				// Construct settings for the AJAX call
				var ajaxSettings = {
					url: options.url,
					type: (options.method === "GET" ? "GET" : "POST"),
					data: (typeof options.ajaxData == "object" ? options.ajaxData : {}),
					cache: options.cache !== false
				};
				if (options.ajaxAsJSON === true) {
					ajaxSettings.dataType = 'json';
				}

				ajaxSettings.error = function(jqXHR, textStatus, errorThrown) {
					$.error('[' + s['plugin_name'] + '] AJAX call returned an error: "' + errorThrown + '"');

					// Trigger the 'ajaxFetchFailed' event for custom callbacks
					$element.trigger('ajaxFetchFailed.' + s['trigger_namespace'], jqXHR, textStatus, errorThrown);

					return false;
				}

				ajaxSettings.success = function(response, textStatus, jqXHR) {
					var newData = data;

					if (typeof response == "object") {
						// Most likely JSON, set title and content accordingly
						
						if (reponse[options.titleFillMethod]) {
							newData.options.title = response[options.titleFillMethod];
							newData.updateNeeded = true; // demand a view update
						}
						if (response[options.contentFillMethod]) {
							newData.options.content = response[options.contentFillMethod];
							newData.updateNeeded = true;
						}
					} else {
						// Set content to reponse body
						newData.options.content = response;
						newData.options.titleFillMethod = 'plain';
						newData.options.contentFillMethod = 'ajax';
						newData.updateNeeded = true;
					}

					// All done with the AJAX stuff
					newData.ajaxFetchNeeded = false;
					newData.ajaxFetchCued = false;
					
					priv.setData.call($element, newData);
					$element.popover('update');

					// Trigger the 'ajaxFetchComplete' event for custom callbacks
					$element.trigger('ajaxFetchComplete.' + s['trigger_namespace'], response, textStatus, jqXHR);
				}

				// Trigger the 'beforeAjaxFetch' event for custom callbacks
				$element.trigger('beforeAjaxFetch.' + s['trigger_namespace'], ajaxSettings);

				$.ajax(ajaxSettings);
			});
		},

		update: function() {
			return factory.call(this, function($element, data) {
				if (data.updateNeeded) {
					$element.popover('updateView');
				}
				
				if (data.ajaxFetchCued) {
					$element.popover('fetchAndUpdate');
				}

				$element.popover('updatePosition');

				// Trigger the 'updated' event for custom callbacks
				$element.trigger('updated.' + s['trigger_namespace']);
			});
		},

		setOptions: function(options) {
			return factory.call(this, function($element, data) {
				options = $.extend({}, data.options, options); // Make the new options object

				if (options.url !== false) {
					data.isAjaxPopover = true;
				}

				// Check for changed AJAX options
				if (data.isAjaxPopover) {
					// Define options that demand an AJAX refresh
					var tmpAjaxCheck = ['url', 'ajaxAsJSON', 'titleFillMethod', 'contentFillMethod', 'loadImmediately', 'cache'];
					$.each(tmpAjaxCheck, function(i, option) {
						if (data.options[option] != options[option]) {
							data.ajaxFetchNeeded = true;
						}
					});
				}

				// Define options that demand a popover view-update
				var tmpContentCheck = ['markup', 'title', 'content'];
				$.each(tmpContentCheck, function(i, option) {
					if (data.options[option] != options[option]) {
						data.updateNeeded = true;
					}
				});

				if (options.anchor !== false) {
					if ( ! options.anchor instanceof jQuery) {
						options.anchor = $(options.anchor);
						if (options.anchor.length !== 1) {
							$.error('[' + s['plugin_name'] + '] Not a valid anchor!');
							return false;
						}
					}
				}
				
				// Set the new options
				data.options = options;
				priv.setData.call($element, data);

				// Update trigger bindings
				$element.popover('updateBindings');
			});
		},

		show: function() {
			return factory.call(this, function($element, data, options, $popover) {
				if (data.ajaxFetchNeeded) {
					data.ajaxFetchCued = true;
					priv.setData.call($element, data);
					$element.one('ajaxFetchComplete.' + s['trigger_namespace'], function() {
						$(this).popover('show');
					}).popover('fetchAndUpdate');
				} else {
					// Fade in the popover with the set speed and trigger the 'show' event
					// for custom callbacks
					$popover.fadeIn(options.showSpeed).trigger('show.' + s['trigger_namespace']);
				}
			});
		},

		hide: function() {
			return factory.call(this, function($element, data, options, $popover) {
				// Fade out the popover with the set speed and trigger the 'hide' event
				// for custom callbacks
				$popover.fadeOut(options.hideSpeed).trigger('hide.' + s['trigger_namespace']);
			});
		},

		hideAll: function() {
			return popovers.popover('hide');
		},

		showAll: function() {
			return popovers.popover('show');
		},

		getData: function() {
			return factory.call(this, 'stdSingle', function($element) {
				return $element.data(s['data_identifier']);
			});
		},

		getPopover: function() {
			return factory.call(this, 'stdSingleData', function($element, data) {
				return data.popover;
			});
		},

		getClasses: function() {
			return $(this).popover('getPopover').attr('class');
		},

		addClass: function(classes) {
			return $(this).popover('getPopover').addClass(classes).popover('update');
		},

		removeClass: function(classes) {
			return $(this).popover('getPopover').removeClass(classes).popover('update');
		}
	};

	// Make some "dynamic" methods
	var tmpFieldMethods = ['title', 'content'];
	$.each(tmpFieldMethods, function(i, field) {
		methods[field] = function(input) {
			return factory.call(this, 'stdEach', function($element, data, options) {
				options[field] = input;
				data[field + 'Element'].html(input);
				data.options = options;
				priv.setData.call($element, data);
			});
		};
	});

	$.fn.popover = function(method) {
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || ! method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error('[' + s['plugin_name'] + '] Method ' + method + ' does not exist in ' + s['plugin_name'] + '.');
		}
	};
})(jQuery);