var mod = angular.module('rt.popup', []);
mod.factory('Popup', [
  '$window',
  '$document',
  '$timeout',
  '$compile',
  function ($window, $document, $timeout, $compile) {
    var openedPopup = null;
    var popups = {};
    var template = '<div class="popover"><div ng-include="popupView"></div></div>';
    // Padding towards edges of screen.
    var padding = 10;
    // Overlap with anchor element.
    var overlap = 5;
    function loseFocus(e) {
      if (!$.contains(openedPopup[0], e.target)) {
        hidePopup();
      }
    }
    function hidePopup() {
      if (!openedPopup) {
        return;
      }
      $timeout(function () {
        openedPopup.hide().remove();
        $document.off('click', loseFocus);
      });
    }
    function showPopup(view, anchor, scope, placement, extra_class) {
      if (!placement) {
        placement = 'right';
      }
      if (!extra_class) {
        extra_class = '';
      }
      scope.popupView = view;
      scope.hidePopover = hidePopup;
      $timeout(function () {
        positionPopup(anchor, scope, placement, extra_class);
      });
    }
    function offset(el) {
      var rect = el[0].getBoundingClientRect();
      return {
        width: rect.width || el.prop('offsetWidth'),
        height: rect.height || el.prop('offsetHeight'),
        top: rect.top + ($window.pageYOffset || $document[0].documentElement.scrollTop),
        left: rect.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft)
      };
    }
    function positionPopup(anchor, scope, placement, extra_class) {
      var popupPosition = null;
      var arrowPosition = null;
      var anchorPoint = null;
      var element = $compile(template)(scope);
      openedPopup = element;
      var anchorGeom = offset(anchor);
      var body = $document.find('body');
      body.append(element);
      var maxHeight = body.height() - 2 * padding;
      // Add arrow
      var arrow = $('<div />', { 'class': 'arrow' });
      element.children('.arrow').remove();
      element.append(arrow);
      // Run in timeout to make sure ngInclude finishes.
      $timeout(function () {
        // Calculate popup position
        if (placement === 'right') {
          anchorPoint = {
            top: anchorGeom.top + anchorGeom.height / 2,
            left: anchorGeom.width - overlap
          };
          popupPosition = {
            top: anchorPoint.top - element.height() / 2,
            left: anchorPoint.left
          };
          // Clamp for edge of screen
          popupPosition.top = Math.max(padding, popupPosition.top);
          arrowPosition = { top: anchorPoint.top - popupPosition.top };
        } else if (placement === 'left') {
          anchorPoint = {
            top: anchorGeom.top + anchorGeom.height / 2,
            left: anchorGeom.left + overlap - 2
          };
          popupPosition = {
            top: anchorPoint.top - element.height() / 2,
            left: anchorPoint.left - element.width()
          };
          // Clamp for edge of screen
          popupPosition.top = Math.max(padding, popupPosition.top);
          arrowPosition = { top: anchorPoint.top - popupPosition.top };
        } else if (placement === 'bottom') {
          anchorPoint = {
            top: anchorGeom.top + anchorGeom.height,
            left: anchorGeom.left + anchorGeom.width / 2
          };
          popupPosition = {
            top: anchorPoint.top - overlap,
            left: anchorPoint.left - element.width() / 2
          };
          // Clamp for edge of screen
          popupPosition.left = Math.max(padding, popupPosition.left);
          maxHeight -= popupPosition.top;
          arrowPosition = { left: anchorPoint.left - popupPosition.left };
        } else {
          throw new Error('Unsupported placement ' + placement);
        }
        element.removeClass('left right bottom top');
        element.addClass(placement);
        if (extra_class) {
          element.addClass(extra_class);
        }
        element.css({
          top: popupPosition.top + 'px',
          left: popupPosition.left + 'px',
          display: 'block',
          maxHeight: maxHeight
        });
        var header = element.find('.popover-title');
        var content = element.find('.popover-content');
        var footer = element.find('.popover-footer');
        content.css({
          maxHeight: maxHeight - footer.outerHeight() - header.outerHeight() - 4,
          overflow: 'auto'
        });
        if (arrowPosition) {
          arrow.css(arrowPosition);
        }
        element.removeClass('hide');
        $document.on('click', loseFocus);
      });
    }
    return {
      register: function (element, id, scope) {
        element.addClass('popover hide');
        popups[id] = {
          element: element,
          scope: scope.$new()
        };
      },
      show: showPopup,
      close: hidePopup
    };
  }
]);
mod.directive('popupShow', [
  'Popup',
  '$parse',
  '$timeout',
  function (Popup, $parse, $timeout) {
    return {
      restrict: 'A',
      scope: true,
      link: function (scope, element, attrs) {
        element.click(function () {
          $timeout(function () {
            Popup.close();
            var shouldShow = $parse(attrs.popupIf || 'true');
            if (shouldShow(scope)) {
              Popup.show(attrs.popupShow, element, scope, attrs.popupPlacement, attrs.popupClass);
            }
          });
        });
      }
    };
  }
]);