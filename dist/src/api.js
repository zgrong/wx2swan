'use strict';

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @file wxml convert swan
 * @author yican
 */

var glob = require('glob');
var babylon = require('babylon');
var traverse = require('babel-traverse').default;
var generate = require('babel-generator').default;
var utils = require('./util/index');
var chalk = require('chalk');
var t = require('babel-types');
var log = require('./util/log');
var componentConf = require('../config/wxmp2swan/component');
var path = require('path');

exports.transformApiContent = function transformViewContent(content, api, prefix, transformedCtx, file) {
    var result = babylon.parse(content, {
        sourceType: 'module',
        plugins: '*'
    });
    // 处理自定义组件log
    traverse(result, {
        ObjectProperty: function ObjectProperty(path) {
            componentLog(path, file, log);
        },
        ObjectMethod: function ObjectMethod(path) {
            componentLog(path, file, log);
        },
        MemberExpression: function MemberExpression(path) {
            componentLog(path, file, log);
        },
        StringLiteral: function StringLiteral(path) {
            componentLog(path, file, log);
        }
    });
    // 转换api接口
    traverse(result, {
        MemberExpression: function MemberExpression(path) {
            var ctx = path.node.object.name;
            handleApiConfigTransform({ ctx: ctx, path: path, api: api, prefix: prefix, transformedCtx: transformedCtx, file: file, log: log });
        }
    });

    // 转换剩余的是标识符的wx字段
    traverse(result, {
        enter: function enter(path) {
            transformWx(path, file, log, prefix, transformedCtx);
            transformRoute(path, file, log);
        },
        Identifier: function Identifier(path) {
            transformGetExtConfigSync(path, file, log);
        }
    });

    var generateResult = generate(result, {});
    return generateResult.code;
};

exports.transformApi = /*#__PURE__*/_regenerator2.default.mark(function transformApi(context) {
    var files, api, prefix, transformedCtx, content, i, code;
    return _regenerator2.default.wrap(function transformApi$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                    _context.next = 2;
                    return new _promise2.default(function (resolve) {
                        var filePath = context.dist;
                        // 添加支持单一文件入口逻辑
                        if (utils.isDirectory(filePath)) {
                            filePath = filePath + '/**/*.js';
                        }
                        var extname = path.extname(filePath);
                        if (extname === '.js') {
                            glob(filePath, { ignore: '**/node_modules/**/*.js' }, function (err, res) {
                                resolve(err ? [] : res);
                            });
                        } else {
                            resolve([]);
                        }
                    });

                case 2:
                    files = _context.sent;
                    api = require('../config/' + context.type + '/api');
                    prefix = context.type === 'wxmp2swan' ? 'wx' : '';
                    // 用于转换context

                    transformedCtx = api.ctx;
                    content = void 0;
                    // 遍历文件进行转换

                    i = 0;

                case 8:
                    if (!(i < files.length)) {
                        _context.next = 18;
                        break;
                    }

                    _context.next = 11;
                    return utils.getContent(files[i]);

                case 11:
                    content = _context.sent;
                    code = exports.transformApiContent(content, api, prefix, transformedCtx, files[i]);
                    _context.next = 15;
                    return utils.saveFile(files[i], code);

                case 15:
                    i++;
                    _context.next = 8;
                    break;

                case 18:
                    console.log(chalk.cyan('👉    Successfully transform js file'));

                case 19:
                case 'end':
                    return _context.stop();
            }
        }
    }, transformApi, this);
});

/**
 * 转换wx.__route__成员表达式调用为wx.route
 *
 * @param {Object} path traverse路径
 * @param {string} file 文件路径
 * @param {Object} log 日志工具
 */
function transformRoute(path, file, log) {
    var beforeAttr = '__route__';
    var afterAttr = 'route';
    var node = path.node;

    if (t.isIdentifier(path.node, { name: beforeAttr })) {
        path.replaceWithSourceString(afterAttr);
        handleLog();
    } else if (t.isStringLiteral(path.node, { value: beforeAttr })) {
        path.replaceWithSourceString('\'' + afterAttr + '\'');
        handleLog();
    }

    function handleLog() {
        log.logger({
            type: 'transform attr __route__',
            file: file,
            row: node.loc.start.line,
            column: node.loc.start.column,
            before: beforeAttr,
            after: afterAttr,
            message: '转换了属性, __route__ ==> route'
        }, 'info');
    }
}

/**
 * 转换swan.getExtConfigSync()函数调用为swan.getExtConfigSync().extConfig
 *
 * @param {Object} path traverse路径
 * @param {string} file 文件路径
 * @param {Object} log 日志工具
 */
function transformGetExtConfigSync(path, file, log) {
    var node = path.node;
    if (!t.isIdentifier(node, { name: 'getExtConfigSync' })) {
        return;
    }
    var parentCallExpression = path.parentPath.parentPath;
    var sourceCode = generate(parentCallExpression.node).code;
    var sourceNode = parentCallExpression.node;
    var parent = parentCallExpression.parentPath;
    var parentProperty = parent.node.property;
    if (!(parentProperty && parentProperty.name === 'extConfig')) {
        var resExpression = t.memberExpression(parentCallExpression.node, t.identifier('extConfig'));
        parentCallExpression.replaceWith(resExpression);
        var afterCode = generate(resExpression).code;
        handleLog(sourceCode, afterCode, sourceNode, file);
    }

    function handleLog(sourceCode, afterCode, node, file) {
        log.logger({
            type: 'transform function getExtConfigSync',
            file: file,
            row: node.loc.start.line,
            column: node.loc.start.column,
            before: sourceCode,
            after: afterCode,
            message: '\u8F6C\u6362\u4E86\u51FD\u6570\u8C03\u7528, ' + sourceCode + ' ==> ' + afterCode
        }, 'info');
    }
}

/**
 * 转换剩余的是标识符的wx字段
 * 如：for in, while中的wx
 *
 * @param {Object} path traverse路径
 * @param {string} file 文件路径
 * @param {Object} log 日志工具
 * @param {string} prefix 要转换的字段名称
 * @param {Object} transformedCtx 转换后的字段集合
 */
function transformWx(path, file, log, prefix, transformedCtx) {
    if (t.isIdentifier(path.node, { name: prefix })) {
        var node = path.node;
        path.replaceWithSourceString(transformedCtx[prefix]);
        log.logger({
            type: 'transform function call arg name',
            file: file,
            row: node.loc.start.line,
            column: node.loc.start.column,
            before: prefix,
            after: transformedCtx[prefix],
            message: '只转换了上下文, wx ==> swan'
        }, 'info');
    }
}

/**
 * 获取对象方法调用成员表达式中的方法名称
 *
 * @param {Object} node traverse节点
 */
function getNodeMethodName(node) {
    var stringLiteralMethod = node.property.value;
    var identifierMethod = node.property.name;
    var methodName = node.property.type === 'StringLiteral' ? stringLiteralMethod : identifierMethod;
    return methodName;
}

/**
 * 获取转换后的对象方法调用成员表达式字符串
 *
 * @param {Object} node traverse节点
 * @param {string} ObjectName 要转换的对象名称
 * @param {string} methodName 要转换的方法名称
 * @return {string} 转换后的方法调用字符串
 */
function getMemberExpressionReplaceCode(node, ObjectName, methodName) {
    var afterCode = '';
    var isStringLiteral = node.property.type === 'StringLiteral';
    /**
     * 对象取值使用[]时computed为true
     * 对象取值使用.时computed为false
    */
    var nodeComputed = node.computed;
    // xxx['yyy'] -> ObjectName['methodName']
    if (isStringLiteral && nodeComputed) {
        afterCode = ObjectName + '[\'' + methodName + '\']';
        // xxx[yyy] -> ObjectName[methodName]
    } else if (nodeComputed) {
        afterCode = ObjectName + '[' + methodName + ']';
        // xxx.yyy -> ObjectName.methodName
    } else {
        afterCode = ObjectName + '.' + methodName;
    }
    return afterCode;
}

/**
 * 自定义组件中不支持的属性打印error日志
 *
 * @param {Object} path traverse路径
 * @param {string} file 文件路径
 * @param {Object} log 日志工具
 */
function componentLog(path, file, log) {
    var node = path.node;
    var sourceCode = generate(path.node).code;
    (0, _keys2.default)(componentConf).forEach(function (key) {
        switch (key) {
            case 'behaviors':
                handleBehaviors();
                break;
            case 'this':
                handleThis();
                break;
            case 'Component':
                handleComponent();
                break;
            case 'Behavior':
                handleBehavior();
        }
    });

    // 处理自定义组件behaviors中的属性
    function handleBehaviors() {
        (0, _keys2.default)(componentConf.behaviors).forEach(function (attr) {
            var confValue = componentConf.behaviors[attr] || {};
            var mappingValue = confValue.mapping;
            if (mappingValue && t.isStringLiteral(path.node) && node.value === attr) {
                // const parent = path.parentPath.parentPath;
                var behaviorsParent = path.findParent(function (path) {
                    return path.isObjectProperty() && path.node.key.name === 'behaviors';
                });
                if (behaviorsParent) {
                    node.value = mappingValue;
                    var afterCode = generate(path.node).code;
                    log.logger({
                        type: 'Compsonent behaviors',
                        file: file,
                        row: node.loc.start.line,
                        column: node.loc.start.column,
                        before: sourceCode,
                        after: afterCode,
                        message: '\u81EA\u5B9A\u4E49\u7EC4\u4EF6---behaviors[' + attr + ']: \u88AB\u66FF\u6362\u4E3Abehaviors[' + mappingValue + ']'
                    }, 'info');
                }
            }
        });
    }

    // 处理自定义组件this上挂载的不支持方法
    function handleThis() {
        if (t.isThisExpression(path.node.object)) {
            (0, _keys2.default)(componentConf.this).forEach(function (method) {
                var confValue = componentConf.this[method];
                var componentParent = path.findParent(function (path) {
                    return path.isCallExpression() && path.node.callee.name === 'Component';
                });
                if (componentParent && confValue === null && t.isIdentifier(path.node.property, { name: method })) {
                    log.logger({
                        type: 'Compsonent this api',
                        file: file,
                        row: node.loc.start.line,
                        column: node.loc.start.column,
                        before: sourceCode,
                        after: sourceCode,
                        message: '\u81EA\u5B9A\u4E49\u7EC4\u4EF6---this.' + method + ': ' + '没有相对应的方法'
                    }, 'error');
                }
                if (t.isIdentifier(path.node.property, { name: method }) && utils.isObject(confValue) && confValue.notAllowParents) {

                    var notAllowParents = confValue.notAllowParents;
                    notAllowParents.forEach(function (notAllowParent) {
                        var parent = path.findParent(function (path) {
                            return (path.isObjectProperty() || path.isObjectMethod()) && path.node.key.name === notAllowParent;
                        });
                        if (!parent) {
                            return;
                        }
                        log.logger({
                            type: 'Compsonent this api',
                            file: file,
                            row: node.loc.start.line,
                            column: node.loc.start.column,
                            before: sourceCode,
                            after: sourceCode,
                            message: '\u81EA\u5B9A\u4E49\u7EC4\u4EF6---this.' + method + ': \u4E0D\u652F\u6301\u5728' + notAllowParent + '\u4E2D\u8C03\u7528'
                        }, 'error');
                    });
                }
            });
        }
    }

    // 处理不支持的自定义组件方法
    function handleComponent() {
        (0, _keys2.default)(componentConf.Component).forEach(function (method) {
            var confValue = componentConf.Component[method];
            if (confValue === null && t.isIdentifier(path.node.key, { name: method })) {
                var parent = path.parentPath.parentPath.node;
                if (parent.type === 'CallExpression' && parent.callee.name === 'Component' || parent.type === 'ObjectProperty' && parent.key.name === 'lifetimes') {
                    log.logger({
                        type: 'Component api',
                        file: file,
                        row: node.loc.start.line,
                        column: node.loc.start.column,
                        before: sourceCode,
                        after: sourceCode,
                        message: '\u81EA\u5B9A\u4E49\u7EC4\u4EF6---' + method + ': ' + '没有相对应的方法'
                    }, 'error');
                }
            }
        });
    }

    // 处理不支持的Behavior方法
    function handleBehavior() {
        (0, _keys2.default)(componentConf.Behavior).forEach(function (method) {
            var confValue = componentConf.Behavior[method];
            if (confValue === null && t.isIdentifier(path.node.key, { name: method })) {
                var parent = path.parentPath.parentPath.node;
                if (parent.type === 'CallExpression' && parent.callee.name === 'Behavior') {
                    log.logger({
                        type: 'Behavior api',
                        file: file,
                        row: node.loc.start.line,
                        column: node.loc.start.column,
                        before: sourceCode,
                        after: sourceCode,
                        message: '\u81EA\u5B9A\u4E49\u7EC4\u4EF6---Behavior[' + method + ']: ' + '没有相对应的方法'
                    }, 'error');
                }
            }
        });
    }
}

/**
 * 根据Api转换配置进行处理
 *
 * @param {string} ctx 当前函数命名空间
 * @param {Object} path traverse路径
 * @param {Object} api Api转换配置
 * @param {string} prefix 要转换的函数命名空间
 * @param {string} transformedCtx Api转换配置中指定的转换后的函数命名空间
 * @param {string} file 要转换函数所在的源文件路径
 * @param {Object} log 日志工具
 */
function handleApiConfigTransform(_ref) {
    var ctx = _ref.ctx,
        path = _ref.path,
        api = _ref.api,
        prefix = _ref.prefix,
        transformedCtx = _ref.transformedCtx,
        file = _ref.file,
        log = _ref.log;

    var method = getNodeMethodName(path.node);
    if (!(ctx === prefix && method && api[ctx] && api[ctx][method])) {
        return;
    }
    var action = api[ctx][method].action;
    switch (action) {
        case 'tip':
            handleTip({ ctx: ctx, path: path, api: api, transformedCtx: transformedCtx, method: method, file: file, log: log });
            break;
        case 'mapping':
            handleMapping({ ctx: ctx, path: path, api: api, transformedCtx: transformedCtx, method: method, file: file, log: log });
            break;
        case 'delete':
            handleDelete({ ctx: ctx, path: path, api: api, transformedCtx: transformedCtx, method: method, file: file, log: log });
            break;
    }

    function handleTip(_ref2) {
        var ctx = _ref2.ctx,
            path = _ref2.path,
            api = _ref2.api,
            transformedCtx = _ref2.transformedCtx,
            method = _ref2.method,
            file = _ref2.file,
            log = _ref2.log;

        var node = path.node;
        var sourceCode = generate(path.node).code;
        var afterCode = transformedCtx[ctx] + '.' + method;
        // 二级api，只处理context，给tips提示，让开发者去手动兼容
        path.replaceWithSourceString(afterCode);
        // 增加transform logs
        log.logger({
            type: 'show tips',
            file: file,
            row: node.loc.start.line,
            column: node.loc.start.column,
            before: sourceCode,
            after: afterCode,
            message: ctx + '.' + method + ' --- ' + api[ctx][method].message
        }, api[ctx][method].logLevel);
    }

    function handleMapping(_ref3) {
        var ctx = _ref3.ctx,
            path = _ref3.path,
            api = _ref3.api,
            transformedCtx = _ref3.transformedCtx,
            method = _ref3.method,
            file = _ref3.file,
            log = _ref3.log;

        var node = path.node;
        var sourceCode = generate(path.node).code;
        // 需要转换
        var mappingName = api[ctx][method].mapping ? api[ctx][method].mapping : method;
        // 只要替换ctx和函数名即可
        var afterCode = transformedCtx[ctx] + '.' + mappingName;
        path.replaceWithSourceString(afterCode);

        // 增加transform logs
        log.logger({
            type: 'transform context && method',
            file: file,
            row: node.loc.start.line,
            column: node.loc.start.column,
            before: sourceCode,
            after: afterCode,
            message: ctx + '.' + method + ' --- ' + api[ctx][method].message
        }, api[ctx][method].logLevel);
    }

    function handleDelete(_ref4) {
        var ctx = _ref4.ctx,
            path = _ref4.path,
            api = _ref4.api,
            transformedCtx = _ref4.transformedCtx,
            method = _ref4.method,
            file = _ref4.file,
            log = _ref4.log;

        var node = path.node;
        var sourceCode = generate(path.node).code;
        var afterCode = '';
        var logType = 'delete api';
        // 处理逻辑父节点是逻辑运算时的场景
        // wx.xxxx && true
        if (t.isLogicalExpression(path.parent)) {
            logType = 'replace with binary expression';
            path.node.object.name = transformedCtx[ctx];
            path.replaceWith(t.binaryExpression('!=', path.node, t.nullLiteral()));
            afterCode = generate(path.node).code;
        }
        // 处理 !wx.unSupported API
        else if (t.isUnaryExpression(path.parent)) {
                logType = 'transform context';
                path.node.object.name = transformedCtx[ctx];
                afterCode = generate(path.node).code;
            } else if (path.parentPath) {
                sourceCode = generate(path.parentPath.node).code;
                // 避免移除父节点导致转码异常退出问题。
                try {
                    path.parentPath.remove();
                } catch (err) {
                    // @TODO: 优化日志
                    logType = 'transform failed';
                    afterCode = sourceCode;
                }
            }

        var methodConfig = api[ctx][method] || {};
        // 增加transform logs
        log.logger({
            type: logType,
            file: file,
            row: node.loc.start.line,
            column: node.loc.start.column,
            before: sourceCode,
            after: afterCode,
            message: ctx + '.' + method + (':' + methodConfig.message)
        }, api[ctx][method].logLevel);
    }
}