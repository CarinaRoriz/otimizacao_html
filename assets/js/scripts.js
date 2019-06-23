(function($) {
    'use strict';
    if (typeof _wpcf7 === 'undefined' || _wpcf7 === null) {
        return;
    }
    _wpcf7 = $.extend({
        cached: 0,
        inputs: []
    }, _wpcf7);
    $.fn.wpcf7InitForm = function() {
        this.ajaxForm({
            beforeSubmit: function(arr, $form, options) {
                $form.wpcf7ClearResponseOutput();
                $form.find('[aria-invalid]').attr('aria-invalid', 'false');
                $form.find('.ajax-loader').addClass('is-active');
                return true;
            },
            beforeSerialize: function($form, options) {
                $form.find('[placeholder].placeheld').each(function(i, n) {
                    $(n).val('');
                });
                return true;
            },
            data: {
                '_wpcf7_is_ajax_call': 1
            },
            dataType: 'json',
            success: $.wpcf7AjaxSuccess,
            error: function(xhr, status, error, $form) {
                var e = $('<div class="ajax-error"></div>').text(error.message);
                $form.after(e);
            }
        });
        if (_wpcf7.cached) {
            this.wpcf7OnloadRefill();
        }
        this.wpcf7ToggleSubmit();
        this.find('.wpcf7-submit').wpcf7AjaxLoader();
        this.find('.wpcf7-acceptance').click(function() {
            $(this).closest('form').wpcf7ToggleSubmit();
        });
        this.find('.wpcf7-exclusive-checkbox').wpcf7ExclusiveCheckbox();
        this.find('.wpcf7-list-item.has-free-text').wpcf7ToggleCheckboxFreetext();
        this.find('[placeholder]').wpcf7Placeholder();
        if (_wpcf7.jqueryUi && !_wpcf7.supportHtml5.date) {
            this.find('input.wpcf7-date[type="date"]').each(function() {
                $(this).datepicker({
                    dateFormat: 'yy-mm-dd',
                    minDate: new Date($(this).attr('min')),
                    maxDate: new Date($(this).attr('max'))
                });
            });
        }
        if (_wpcf7.jqueryUi && !_wpcf7.supportHtml5.number) {
            this.find('input.wpcf7-number[type="number"]').each(function() {
                $(this).spinner({
                    min: $(this).attr('min'),
                    max: $(this).attr('max'),
                    step: $(this).attr('step')
                });
            });
        }
        this.find('.wpcf7-character-count').wpcf7CharacterCount();
        this.find('.wpcf7-validates-as-url').change(function() {
            $(this).wpcf7NormalizeUrl();
        });
        this.find('.wpcf7-recaptcha').wpcf7Recaptcha();
    };
    $.wpcf7AjaxSuccess = function(data, status, xhr, $form) {
        if (!$.isPlainObject(data) || $.isEmptyObject(data)) {
            return;
        }
        _wpcf7.inputs = $form.serializeArray();
        var $responseOutput = $form.find('div.wpcf7-response-output');
        $form.wpcf7ClearResponseOutput();
        $form.find('.wpcf7-form-control').removeClass('wpcf7-not-valid');
        $form.removeClass('invalid spam sent failed');
        if (data.captcha) {
            $form.wpcf7RefillCaptcha(data.captcha);
        }
        if (data.quiz) {
            $form.wpcf7RefillQuiz(data.quiz);
        }
        if (data.invalids) {
            $.each(data.invalids, function(i, n) {
                $form.find(n.into).wpcf7NotValidTip(n.message);
                $form.find(n.into).find('.wpcf7-form-control').addClass('wpcf7-not-valid');
                $form.find(n.into).find('[aria-invalid]').attr('aria-invalid', 'true');
            });
            $responseOutput.addClass('wpcf7-validation-errors');
            $form.addClass('invalid');
            $(data.into).wpcf7TriggerEvent('invalid');
        } else if (1 == data.spam) {
            $form.find('[name="g-recaptcha-response"]').each(function() {
                if ('' == $(this).val()) {
                    var $recaptcha = $(this).closest('.wpcf7-form-control-wrap');
                    $recaptcha.wpcf7NotValidTip(_wpcf7.recaptcha.messages.empty);
                }
            });
            $responseOutput.addClass('wpcf7-spam-blocked');
            $form.addClass('spam');
            $(data.into).wpcf7TriggerEvent('spam');
        } else if (1 == data.mailSent) {
            $responseOutput.addClass('wpcf7-mail-sent-ok');
            $form.addClass('sent');
            if (data.onSentOk) {
                $.each(data.onSentOk, function(i, n) {
                    eval(n)
                });
            }
            $(data.into).wpcf7TriggerEvent('mailsent');
        } else {
            $responseOutput.addClass('wpcf7-mail-sent-ng');
            $form.addClass('failed');
            $(data.into).wpcf7TriggerEvent('mailfailed');
        }
        if (data.onSubmit) {
            $.each(data.onSubmit, function(i, n) {
                eval(n)
            });
        }
        $(data.into).wpcf7TriggerEvent('submit');
        if (1 == data.mailSent) {
            $form.resetForm();
        }
        $form.find('[placeholder].placeheld').each(function(i, n) {
            $(n).val($(n).attr('placeholder'));
        });
        $responseOutput.append(data.message).slideDown('fast');
        $responseOutput.attr('role', 'alert');
        $.wpcf7UpdateScreenReaderResponse($form, data);
    };
    $.fn.wpcf7TriggerEvent = function(name) {
        return this.each(function() {
            var elmId = this.id;
            var inputs = _wpcf7.inputs;
            var event = new CustomEvent('wpcf7' + name, {
                bubbles: true,
                detail: {
                    id: elmId,
                    inputs: inputs
                }
            });
            this.dispatchEvent(event);
            $(this).trigger('wpcf7:' + name);
            $(this).trigger(name + '.wpcf7');
        });
    };
    $.fn.wpcf7ExclusiveCheckbox = function() {
        return this.find('input:checkbox').click(function() {
            var name = $(this).attr('name');
            $(this).closest('form').find('input:checkbox[name="' + name + '"]').not(this).prop('checked', false);
        });
    };
    $.fn.wpcf7Placeholder = function() {
        if (_wpcf7.supportHtml5.placeholder) {
            return this;
        }
        return this.each(function() {
            $(this).val($(this).attr('placeholder'));
            $(this).addClass('placeheld');
            $(this).focus(function() {
                if ($(this).hasClass('placeheld')) {
                    $(this).val('').removeClass('placeheld');
                }
            });
            $(this).blur(function() {
                if ('' === $(this).val()) {
                    $(this).val($(this).attr('placeholder'));
                    $(this).addClass('placeheld');
                }
            });
        });
    };
    $.fn.wpcf7AjaxLoader = function() {
        return this.each(function() {
            $(this).after('<span class="ajax-loader"></span>');
        });
    };
    $.fn.wpcf7ToggleSubmit = function() {
        return this.each(function() {
            var form = $(this);
            if (this.tagName.toLowerCase() != 'form') {
                form = $(this).find('form').first();
            }
            if (form.hasClass('wpcf7-acceptance-as-validation')) {
                return;
            }
            var submit = form.find('input:submit');
            if (!submit.length) {
                return;
            }
            var acceptances = form.find('input:checkbox.wpcf7-acceptance');
            if (!acceptances.length) {
                return;
            }
            submit.removeAttr('disabled');
            acceptances.each(function(i, n) {
                n = $(n);
                if (n.hasClass('wpcf7-invert') && n.is(':checked') || !n.hasClass('wpcf7-invert') && !n.is(':checked')) {
                    submit.attr('disabled', 'disabled');
                }
            });
        });
    };
    $.fn.wpcf7ToggleCheckboxFreetext = function() {
        return this.each(function() {
            var $wrap = $(this).closest('.wpcf7-form-control');
            if ($(this).find(':checkbox, :radio').is(':checked')) {
                $(this).find(':input.wpcf7-free-text').prop('disabled', false);
            } else {
                $(this).find(':input.wpcf7-free-text').prop('disabled', true);
            }
            $wrap.find(':checkbox, :radio').change(function() {
                var $cb = $('.has-free-text', $wrap).find(':checkbox, :radio');
                var $freetext = $(':input.wpcf7-free-text', $wrap);
                if ($cb.is(':checked')) {
                    $freetext.prop('disabled', false).focus();
                } else {
                    $freetext.prop('disabled', true);
                }
            });
        });
    };
    $.fn.wpcf7CharacterCount = function() {
        return this.each(function() {
            var $count = $(this);
            var name = $count.attr('data-target-name');
            var down = $count.hasClass('down');
            var starting = parseInt($count.attr('data-starting-value'), 10);
            var maximum = parseInt($count.attr('data-maximum-value'), 10);
            var minimum = parseInt($count.attr('data-minimum-value'), 10);
            var updateCount = function($target) {
                var length = $target.val().length;
                var count = down ? starting - length : length;
                $count.attr('data-current-value', count);
                $count.text(count);
                if (maximum && maximum < length) {
                    $count.addClass('too-long');
                } else {
                    $count.removeClass('too-long');
                }
                if (minimum && length < minimum) {
                    $count.addClass('too-short');
                } else {
                    $count.removeClass('too-short');
                }
            };
            $count.closest('form').find(':input[name="' + name + '"]').each(function() {
                updateCount($(this));
                $(this).keyup(function() {
                    updateCount($(this));
                });
            });
        });
    };
    $.fn.wpcf7NormalizeUrl = function() {
        return this.each(function() {
            var val = $.trim($(this).val());
            if (val && !val.match(/^[a-z][a-z0-9.+-]*:/i)) {
                val = val.replace(/^\/+/, '');
                val = 'http://' + val;
            }
            $(this).val(val);
        });
    };
    $.fn.wpcf7NotValidTip = function(message) {
        return this.each(function() {
            var $into = $(this);
            $into.find('span.wpcf7-not-valid-tip').remove();
            $into.append('<span role="alert" class="wpcf7-not-valid-tip">' + message + '</span>');
            if ($into.is('.use-floating-validation-tip *')) {
                $('.wpcf7-not-valid-tip', $into).mouseover(function() {
                    $(this).wpcf7FadeOut();
                });
                $(':input', $into).focus(function() {
                    $('.wpcf7-not-valid-tip', $into).not(':hidden').wpcf7FadeOut();
                });
            }
        });
    };
    $.fn.wpcf7FadeOut = function() {
        return this.each(function() {
            $(this).animate({
                opacity: 0
            }, 'fast', function() {
                $(this).css({
                    'z-index': -100
                });
            });
        });
    };
    $.fn.wpcf7OnloadRefill = function() {
        return this.each(function() {
            var url = $(this).attr('action');
            if (0 < url.indexOf('#')) {
                url = url.substr(0, url.indexOf('#'));
            }
            var id = $(this).find('input[name="_wpcf7"]').val();
            var unitTag = $(this).find('input[name="_wpcf7_unit_tag"]').val();
            $.getJSON(url, {
                _wpcf7_is_ajax_call: 1,
                _wpcf7: id,
                _wpcf7_request_ver: $.now()
            }, function(data) {
                if (data && data.captcha) {
                    $('#' + unitTag).wpcf7RefillCaptcha(data.captcha);
                }
                if (data && data.quiz) {
                    $('#' + unitTag).wpcf7RefillQuiz(data.quiz);
                }
            });
        });
    };
    $.fn.wpcf7RefillCaptcha = function(captcha) {
        return this.each(function() {
            var form = $(this);
            $.each(captcha, function(i, n) {
                form.find(':input[name="' + i + '"]').clearFields();
                form.find('img.wpcf7-captcha-' + i).attr('src', n);
                var match = /([0-9]+)\.(png|gif|jpeg)$/.exec(n);
                form.find('input:hidden[name="_wpcf7_captcha_challenge_' + i + '"]').attr('value', match[1]);
            });
        });
    };
    $.fn.wpcf7RefillQuiz = function(quiz) {
        return this.each(function() {
            var form = $(this);
            $.each(quiz, function(i, n) {
                form.find(':input[name="' + i + '"]').clearFields();
                form.find(':input[name="' + i + '"]').siblings('span.wpcf7-quiz-label').text(n[0]);
                form.find('input:hidden[name="_wpcf7_quiz_answer_' + i + '"]').attr('value', n[1]);
            });
        });
    };
    $.fn.wpcf7ClearResponseOutput = function() {
        return this.each(function() {
            $(this).find('div.wpcf7-response-output').hide().empty().removeClass('wpcf7-mail-sent-ok wpcf7-mail-sent-ng wpcf7-validation-errors wpcf7-spam-blocked').removeAttr('role');
            $(this).find('span.wpcf7-not-valid-tip').remove();
            $(this).find('.ajax-loader').removeClass('is-active');
        });
    };
    $.fn.wpcf7Recaptcha = function() {
        return this.each(function() {
            var events = 'wpcf7:spam wpcf7:mailsent wpcf7:mailfailed';
            $(this).closest('div.wpcf7').on(events, function(e) {
                if (recaptchaWidgets && grecaptcha) {
                    $.each(recaptchaWidgets, function(index, value) {
                        grecaptcha.reset(value);
                    });
                }
            });
        });
    };
    $.wpcf7UpdateScreenReaderResponse = function($form, data) {
        $('.wpcf7 .screen-reader-response').html('').attr('role', '');
        if (data.message) {
            var $response = $form.siblings('.screen-reader-response').first();
            $response.append(data.message);
            if (data.invalids) {
                var $invalids = $('<ul></ul>');
                $.each(data.invalids, function(i, n) {
                    if (n.idref) {
                        var $li = $('<li></li>').append($('<a></a>').attr('href', '#' + n.idref).append(n.message));
                    } else {
                        var $li = $('<li></li>').append(n.message);
                    }
                    $invalids.append($li);
                });
                $response.append($invalids);
            }
            $response.attr('role', 'alert').focus();
        }
    };
    $.wpcf7SupportHtml5 = function() {
        var features = {};
        var input = document.createElement('input');
        features.placeholder = 'placeholder' in input;
        var inputTypes = ['email', 'url', 'tel', 'number', 'range', 'date'];
        $.each(inputTypes, function(index, value) {
            input.setAttribute('type', value);
            features[value] = input.type !== 'text';
        });
        return features;
    };
    $(function() {
        _wpcf7.supportHtml5 = $.wpcf7SupportHtml5();
        $('div.wpcf7 > form').wpcf7InitForm();
    });
})(jQuery);
(function() {
    if (typeof window.CustomEvent === "function") return false;

    function CustomEvent(event, params) {
        params = params || {
            bubbles: false,
            cancelable: false,
            detail: undefined
        };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    }
    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent;
})();

jQuery().ready(function () { tdWeather.addItem({ "block_uid": "td_top_weather_uid", "location": "New York", "api_location": "New York", "api_language": "en", "api_key": "c937b98a4e6a49405410bfe0790a0eac", "today_icon": "broken-clouds-d", "today_icon_text": "broken clouds", "today_temp": [22.9, 73.2], "today_humidity": 53, "today_wind_speed": [1.9, 1.2], "today_min": [22, 71.6], "today_max": [24, 75.2], "today_clouds": 75, "current_unit": 0, "forecast": [{ "timestamp": 1530036000, "day_name": "Tue", "day_temp": [25, 77], "owm_day_index": 0 }, { "timestamp": 1530057600, "day_name": "Wed", "day_temp": [24, 75], "owm_day_index": 2 }, { "timestamp": 1530144000, "day_name": "Thu", "day_temp": [24, 75], "owm_day_index": 10 }, { "timestamp": 1530230400, "day_name": "Fri", "day_temp": [29, 83], "owm_day_index": 18 }, { "timestamp": 1530316800, "day_name": "Sat", "day_temp": [31, 88], "owm_day_index": 26 }, { "timestamp": 1530403200, "day_name": "Sun", "day_temp": [28, 83], "owm_day_index": 34 }] }); }); jQuery(window).load(function () { jQuery('body').find('#td_uid_1_5b3289782e2af .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); jQuery(window).ready(function () { setTimeout(function () { var $content = jQuery('body').find('#tdc-live-iframe'), refWindow = undefined; if ($content.length) { $content = $content.contents(); refWindow = document.getElementById('tdc-live-iframe').contentWindow || document.getElementById('tdc-live-iframe').contentDocument; } else { $content = jQuery('body'); refWindow = window; } $content.find('#td_uid_1_5b3289782e2af .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); }, 200); jQuery(window).load(function () { jQuery('body').find('#td_uid_3_5b32897830199 .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); jQuery(window).ready(function () { setTimeout(function () { var $content = jQuery('body').find('#tdc-live-iframe'), refWindow = undefined; if ($content.length) { $content = $content.contents(); refWindow = document.getElementById('tdc-live-iframe').contentWindow || document.getElementById('tdc-live-iframe').contentDocument; } else { $content = jQuery('body'); refWindow = window; } $content.find('#td_uid_3_5b32897830199 .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); }, 200); jQuery(window).load(function () { jQuery('body').find('#td_uid_6_5b3289783a22b .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); jQuery(window).ready(function () { setTimeout(function () { var $content = jQuery('body').find('#tdc-live-iframe'), refWindow = undefined; if ($content.length) { $content = $content.contents(); refWindow = document.getElementById('tdc-live-iframe').contentWindow || document.getElementById('tdc-live-iframe').contentDocument; } else { $content = jQuery('body'); refWindow = window; } $content.find('#td_uid_6_5b3289783a22b .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); }, 200); jQuery(window).load(function () { jQuery('body').find('#td_uid_9_5b3289783cf57 .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); jQuery(window).ready(function () { setTimeout(function () { var $content = jQuery('body').find('#tdc-live-iframe'), refWindow = undefined; if ($content.length) { $content = $content.contents(); refWindow = document.getElementById('tdc-live-iframe').contentWindow || document.getElementById('tdc-live-iframe').contentDocument; } else { $content = jQuery('body'); refWindow = window; } $content.find('#td_uid_9_5b3289783cf57 .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); }, 200); jQuery(window).load(function () { jQuery('body').find('#td_uid_11_5b3289783d2ae .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); jQuery(window).ready(function () { setTimeout(function () { var $content = jQuery('body').find('#tdc-live-iframe'), refWindow = undefined; if ($content.length) { $content = $content.contents(); refWindow = document.getElementById('tdc-live-iframe').contentWindow || document.getElementById('tdc-live-iframe').contentDocument; } else { $content = jQuery('body'); refWindow = window; } $content.find('#td_uid_11_5b3289783d2ae .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); }, 200); jQuery(window).load(function () { jQuery('body').find('#td_uid_15_5b3289784140c .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); jQuery(window).ready(function () { setTimeout(function () { var $content = jQuery('body').find('#tdc-live-iframe'), refWindow = undefined; if ($content.length) { $content = $content.contents(); refWindow = document.getElementById('tdc-live-iframe').contentWindow || document.getElementById('tdc-live-iframe').contentDocument; } else { $content = jQuery('body'); refWindow = window; } $content.find('#td_uid_15_5b3289784140c .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); }, 200); (function () { var html_jquery_obj = jQuery('html'); if (html_jquery_obj.length && (html_jquery_obj.is('.ie8') || html_jquery_obj.is('.ie9'))) { var path = 'https://demo.tagdiv.com/newspaper/wp-content/themes/011/style.css'; jQuery.get(path, function (data) { var str_split_separator = '#td_css_split_separator'; var arr_splits = data.split(str_split_separator); var arr_length = arr_splits.length; if (arr_length > 1) { var dir_path = 'https://demo.tagdiv.com/newspaper/wp-content/themes/011'; var splited_css = ''; for (var i = 0; i < arr_length; i++) { if (i > 0) { arr_splits[i] = str_split_separator + ' ' + arr_splits[i]; } var formated_str = arr_splits[i].replace(/\surl\(\'(?!data\:)/gi, function regex_function(str) { return ' url(\'' + dir_path + '/' + str.replace(/url\(\'/gi, '').replace(/^\s+|\s+$/gm, ''); }); splited_css += "<style>" + formated_str + "</style>"; } var td_theme_css = jQuery('link#td-theme-css'); if (td_theme_css.length) { td_theme_css.after(splited_css); } } }); } })();
(function (jQuery, undefined) { jQuery(window).ready(function () { if ('undefined' !== typeof tdcAdminIFrameUI) { var $liveIframe = tdcAdminIFrameUI.getLiveIframe(); if ($liveIframe.length) { $liveIframe.load(function () { $liveIframe.contents().find('body').append('<textarea class="tdw-css-writer-editor" style="display: none"></textarea>'); }); } } }); })(jQuery);
jQuery(window).load(function () { if ('undefined' !== typeof tdLiveCssInject) { tdLiveCssInject.init(); var editor_textarea = jQuery('.td_live_css_uid_1_5b32897848937'); var languageTools = ace.require("ace/ext/language_tools"); var tdcCompleter = { getCompletions: function (editor, session, pos, prefix, callback) { if (prefix.length === 0) { callback(null, []); return } if ('undefined' !== typeof tdcAdminIFrameUI) { var data = { error: undefined, getShortcode: '' }; tdcIFrameData.getShortcodeFromData(data); if (!_.isUndefined(data.error)) { tdcDebug.log(data.error); } if (!_.isUndefined(data.getShortcode)) { var regex = /el_class=\"([A-Za-z0-9_-]*\s*)+\"/g, results = data.getShortcode.match(regex); var elClasses = {}; for (var i = 0; i < results.length; i++) { var currentClasses = results[i].replace('el_class="', '').replace('"', '').split(' '); for (var j = 0; j < currentClasses.length; j++) { if (_.isUndefined(elClasses[currentClasses[j]])) { elClasses[currentClasses[j]] = ''; } } } var arrElClasses = []; for (var prop in elClasses) { arrElClasses.push(prop); } callback(null, arrElClasses.map(function (item) { return { name: item, value: item, meta: 'in_page' } })); } } } }; languageTools.addCompleter(tdcCompleter); window.editor = ace.edit("td_live_css_uid_1_5b32897848937"); window.editorChangeHandler = function () { window.onbeforeunload = function () { if (tdwState.lessWasEdited) { return "You have attempted to leave this page. Are you sure?"; } return false; }; var editorValue = editor.getSession().getValue(); editor_textarea.val(editorValue); if ('undefined' !== typeof tdcAdminIFrameUI) { tdcAdminIFrameUI.getLiveIframe().contents().find('.tdw-css-writer-editor:first').val(editorValue); tdcMain.setContentModified(); } tdLiveCssInject.less(); }; editor.getSession().setValue(editor_textarea.val()); editor.getSession().on('change', editorChangeHandler); editor.setTheme("ace/theme/textmate"); editor.setShowPrintMargin(false); editor.getSession().setMode("ace/mode/less"); editor.setOptions({ enableBasicAutocompletion: true, enableSnippets: true, enableLiveAutocompletion: false }); } });
jQuery().ready(function () { tdWeather.addItem({ "block_uid": "td_top_weather_uid", "location": "New York", "api_location": "New York", "api_language": "en", "api_key": "c937b98a4e6a49405410bfe0790a0eac", "today_icon": "broken-clouds-d", "today_icon_text": "broken clouds", "today_temp": [22.9, 73.2], "today_humidity": 53, "today_wind_speed": [1.9, 1.2], "today_min": [22, 71.6], "today_max": [24, 75.2], "today_clouds": 75, "current_unit": 0, "forecast": [{ "timestamp": 1530036000, "day_name": "Tue", "day_temp": [25, 77], "owm_day_index": 0 }, { "timestamp": 1530057600, "day_name": "Wed", "day_temp": [24, 75], "owm_day_index": 2 }, { "timestamp": 1530144000, "day_name": "Thu", "day_temp": [24, 75], "owm_day_index": 10 }, { "timestamp": 1530230400, "day_name": "Fri", "day_temp": [29, 83], "owm_day_index": 18 }, { "timestamp": 1530316800, "day_name": "Sat", "day_temp": [31, 88], "owm_day_index": 26 }, { "timestamp": 1530403200, "day_name": "Sun", "day_temp": [28, 83], "owm_day_index": 34 }] }); }); jQuery(window).load(function () { jQuery('body').find('#td_uid_1_5b3289782e2af .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); jQuery(window).ready(function () { setTimeout(function () { var $content = jQuery('body').find('#tdc-live-iframe'), refWindow = undefined; if ($content.length) { $content = $content.contents(); refWindow = document.getElementById('tdc-live-iframe').contentWindow || document.getElementById('tdc-live-iframe').contentDocument; } else { $content = jQuery('body'); refWindow = window; } $content.find('#td_uid_1_5b3289782e2af .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); }, 200); jQuery(window).load(function () { jQuery('body').find('#td_uid_3_5b32897830199 .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); jQuery(window).ready(function () { setTimeout(function () { var $content = jQuery('body').find('#tdc-live-iframe'), refWindow = undefined; if ($content.length) { $content = $content.contents(); refWindow = document.getElementById('tdc-live-iframe').contentWindow || document.getElementById('tdc-live-iframe').contentDocument; } else { $content = jQuery('body'); refWindow = window; } $content.find('#td_uid_3_5b32897830199 .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); }, 200); jQuery(window).load(function () { jQuery('body').find('#td_uid_6_5b3289783a22b .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); jQuery(window).ready(function () { setTimeout(function () { var $content = jQuery('body').find('#tdc-live-iframe'), refWindow = undefined; if ($content.length) { $content = $content.contents(); refWindow = document.getElementById('tdc-live-iframe').contentWindow || document.getElementById('tdc-live-iframe').contentDocument; } else { $content = jQuery('body'); refWindow = window; } $content.find('#td_uid_6_5b3289783a22b .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); }, 200); jQuery(window).load(function () { jQuery('body').find('#td_uid_9_5b3289783cf57 .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); jQuery(window).ready(function () { setTimeout(function () { var $content = jQuery('body').find('#tdc-live-iframe'), refWindow = undefined; if ($content.length) { $content = $content.contents(); refWindow = document.getElementById('tdc-live-iframe').contentWindow || document.getElementById('tdc-live-iframe').contentDocument; } else { $content = jQuery('body'); refWindow = window; } $content.find('#td_uid_9_5b3289783cf57 .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); }, 200); jQuery(window).load(function () { jQuery('body').find('#td_uid_11_5b3289783d2ae .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); jQuery(window).ready(function () { setTimeout(function () { var $content = jQuery('body').find('#tdc-live-iframe'), refWindow = undefined; if ($content.length) { $content = $content.contents(); refWindow = document.getElementById('tdc-live-iframe').contentWindow || document.getElementById('tdc-live-iframe').contentDocument; } else { $content = jQuery('body'); refWindow = window; } $content.find('#td_uid_11_5b3289783d2ae .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); }, 200); jQuery(window).load(function () { jQuery('body').find('#td_uid_15_5b3289784140c .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); jQuery(window).ready(function () { setTimeout(function () { var $content = jQuery('body').find('#tdc-live-iframe'), refWindow = undefined; if ($content.length) { $content = $content.contents(); refWindow = document.getElementById('tdc-live-iframe').contentWindow || document.getElementById('tdc-live-iframe').contentDocument; } else { $content = jQuery('body'); refWindow = window; } $content.find('#td_uid_15_5b3289784140c .td-element-style').each(function (index, element) { jQuery(element).css('opacity', 1); return; }); }); }, 200); (function () { var html_jquery_obj = jQuery('html'); if (html_jquery_obj.length && (html_jquery_obj.is('.ie8') || html_jquery_obj.is('.ie9'))) { var path = 'https://demo.tagdiv.com/newspaper/wp-content/themes/011/style.css'; jQuery.get(path, function (data) { var str_split_separator = '#td_css_split_separator'; var arr_splits = data.split(str_split_separator); var arr_length = arr_splits.length; if (arr_length > 1) { var dir_path = 'https://demo.tagdiv.com/newspaper/wp-content/themes/011'; var splited_css = ''; for (var i = 0; i < arr_length; i++) { if (i > 0) { arr_splits[i] = str_split_separator + ' ' + arr_splits[i]; } var formated_str = arr_splits[i].replace(/\surl\(\'(?!data\:)/gi, function regex_function(str) { return ' url(\'' + dir_path + '/' + str.replace(/url\(\'/gi, '').replace(/^\s+|\s+$/gm, ''); }); splited_css += "<style>" + formated_str + "</style>"; } var td_theme_css = jQuery('link#td-theme-css'); if (td_theme_css.length) { td_theme_css.after(splited_css); } } }); } })();