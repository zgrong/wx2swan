/**
 * 视图内容解析为ast
 *
 * @file 视图内容解析为ast
 * @author yican, hiby
 */

'use strict';

var _ = require('lodash');

var _require = require('../util'),
    FAKE_ROOT = _require.fakeRoot,
    getHtmlParser = _require.getHtmlParser;

module.exports = function parse(options) {
    options = options || {
        xmlMode: false,
        lowerCaseAttributeNames: false,
        recognizeSelfClosing: true,
        lowerCaseTags: false
    };

    this.Parser = parser;

    function parser(doc) {
        var _getHtmlParser = getHtmlParser(options),
            htmlParser = _getHtmlParser.htmlParser,
            handler = _getHtmlParser.handler;

        htmlParser.end(doc);
        return {
            type: 'tag',
            name: FAKE_ROOT,
            attribs: {},
            children: _.isArray(handler.dom) ? handler.dom : [handler.dom]
        };
    }
};