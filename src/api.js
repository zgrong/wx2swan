/**
 * @file wxml convert swan
 * @author yican
 */

const glob = require('glob');
const babylon = require('babylon');
const traverse = require('babel-traverse').default;
const generate = require('babel-generator').default;
const utils = require('./util/index');
const chalk = require('chalk');
const t = require('babel-types');
const log = require('./util/log');
const componentConf = require('../config/wxmp2swan/component');
const path = require('path');

exports.transformApiContent = function transformViewContent(content, api, prefix, transformedCtx, file) {
    const result = babylon.parse(content, {
        sourceType: 'module',
        plugins: '*'
    });
    // 处理自定义组件log
    traverse(result, {
        ObjectProperty(path) {
            componentLog(path, file, log);
        },
        ObjectMethod(path) {
            componentLog(path, file, log);
        },
        MemberExpression(path) {
            componentLog(path, file, log);
        },
        StringLiteral(path) {
            componentLog(path, file, log);
        }
    });
    // 转换api接口
    traverse(result, {
        MemberExpression(path) {
            const ctx = path.node.object.name;
            handleApiConfigTransform({ctx, path, api, prefix, transformedCtx, file, log});
        }
    });

    // 转换剩余的是标识符的wx字段
    traverse(result, {
        enter(path) {
            transformWx(path, file, log, prefix, transformedCtx);
            transformRoute(path, file, log);
        },
        Identifier(path) {
            transformGetExtConfigSync(path, file, log);
        }
    });

    const generateResult = generate(result, {});
    return generateResult.code;
};

exports.transformApi = function* transformApi(context) {
    // 过滤js文件
    const files = yield new Promise(resolve => {
        let filePath = context.dist;
        // 添加支持单一文件入口逻辑
        if (utils.isDirectory(filePath)) {
            filePath = filePath + '/**/*.js';
        }
        const extname = path.extname(filePath);
        if (extname === '.js') {
            glob(filePath, {ignore: '**/node_modules/**/*.js'}, function (err, res) {
                resolve(err ? [] : res);
            });
        } else {
            resolve([]);
        }
    });
    const api = require('../config/' + context.type + '/api');
    const prefix = context.type === 'wxmp2swan' ? 'wx' : '';
    // 用于转换context
    const transformedCtx = api.ctx;
    let content;
    // 遍历文件进行转换
    for (let i = 0; i < files.length; i++) {
        content = yield utils.getContent(files[i]);
        const code = exports.transformApiContent(content, api, prefix, transformedCtx, files[i]);
        yield utils.saveFile(files[i], code);

    }
    console.log(chalk.cyan('👉    Successfully transform js file'));

};

/**
 * 转换wx.__route__成员表达式调用为wx.route
 *
 * @param {Object} path traverse路径
 * @param {string} file 文件路径
 * @param {Object} log 日志工具
 */
function transformRoute(path, file, log) {
    const beforeAttr = '__route__';
    const afterAttr = 'route';
    const node = path.node;

    if (t.isIdentifier(path.node, {name: beforeAttr})) {
        path.replaceWithSourceString(afterAttr);
        handleLog();
    } else if (t.isStringLiteral(path.node, {value: beforeAttr})) {
        path.replaceWithSourceString(`'${afterAttr}'`);
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
    const node = path.node;
    if (!t.isIdentifier(node, {name: 'getExtConfigSync'})) {
        return;
    }
    const parentCallExpression = path.parentPath.parentPath;
    const sourceCode = generate(parentCallExpression.node).code;
    const sourceNode = parentCallExpression.node;
    const parent = parentCallExpression.parentPath;
    const parentProperty = parent.node.property;
    if (!(parentProperty && parentProperty.name === 'extConfig')) {
        const resExpression = t.memberExpression(parentCallExpression.node, t.identifier('extConfig'));
        parentCallExpression.replaceWith(resExpression);
        const afterCode = generate(resExpression).code;
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
            message: `转换了函数调用, ${sourceCode} ==> ${afterCode}`
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
    if (t.isIdentifier(path.node, {name: prefix})) {
        const node = path.node;
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
    const stringLiteralMethod = node.property.value;
    const identifierMethod = node.property.name;
    const methodName = node.property.type === 'StringLiteral' ? stringLiteralMethod : identifierMethod;
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
    let afterCode = '';
    const isStringLiteral = node.property.type === 'StringLiteral';
    /**
     * 对象取值使用[]时computed为true
     * 对象取值使用.时computed为false
    */
    const nodeComputed = node.computed;
    // xxx['yyy'] -> ObjectName['methodName']
    if (isStringLiteral && nodeComputed) {
        afterCode = `${ObjectName}['${methodName}']`;
    // xxx[yyy] -> ObjectName[methodName]
    } else if (nodeComputed) {
        afterCode = `${ObjectName}[${methodName}]`;
    // xxx.yyy -> ObjectName.methodName
    } else {
        afterCode = `${ObjectName}.${methodName}`;
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
    const node = path.node;
    const sourceCode = generate(path.node).code;
    Object.keys(componentConf).forEach(key => {
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
        Object.keys(componentConf.behaviors).forEach(attr => {
            const confValue = componentConf.behaviors[attr] || {};
            const mappingValue = confValue.mapping;
            if (mappingValue && t.isStringLiteral(path.node) && node.value === attr) {
                // const parent = path.parentPath.parentPath;
                const behaviorsParent = path.findParent(path => {
                    return path.isObjectProperty() && path.node.key.name === 'behaviors';
                });
                if (behaviorsParent) {
                    node.value = mappingValue;
                    const afterCode = generate(path.node).code;
                    log.logger({
                        type: 'Compsonent behaviors',
                        file: file,
                        row: node.loc.start.line,
                        column: node.loc.start.column,
                        before: sourceCode,
                        after: afterCode,
                        message: `自定义组件---behaviors[${attr}]: 被替换为behaviors[${mappingValue}]`
                    }, 'info');
                }
            }
        });
    }

    // 处理自定义组件this上挂载的不支持方法
    function handleThis() {
        if (t.isThisExpression(path.node.object)) {
            Object.keys(componentConf.this).forEach(method => {
                const confValue = componentConf.this[method];
                const componentParent = path.findParent(path => {
                    return path.isCallExpression() && path.node.callee.name === 'Component';
                });
                if (componentParent && confValue === null && t.isIdentifier(path.node.property, {name: method})) {
                    log.logger({
                        type: 'Compsonent this api',
                        file: file,
                        row: node.loc.start.line,
                        column: node.loc.start.column,
                        before: sourceCode,
                        after: sourceCode,
                        message: `自定义组件---this.${method}: ${'没有相对应的方法'}`
                    }, 'error');
                }
                if (t.isIdentifier(path.node.property, {name: method})
                && utils.isObject(confValue) && confValue.notAllowParents) {

                    const notAllowParents = confValue.notAllowParents;
                    notAllowParents.forEach(notAllowParent => {
                        const parent = path.findParent(path => {
                            return (path.isObjectProperty() || path.isObjectMethod())
                            && path.node.key.name === notAllowParent;
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
                            message: `自定义组件---this.${method}: 不支持在${notAllowParent}中调用`
                        }, 'error');
                    });
                }
            });
        }
    }

    // 处理不支持的自定义组件方法
    function handleComponent() {
        Object.keys(componentConf.Component).forEach(method => {
            const confValue = componentConf.Component[method];
            if (confValue === null && t.isIdentifier(path.node.key, {name: method})) {
                const parent = path.parentPath.parentPath.node;
                if ((parent.type === 'CallExpression' && parent.callee.name === 'Component')
                    || (parent.type === 'ObjectProperty' && parent.key.name === 'lifetimes')) {
                    log.logger({
                        type: 'Component api',
                        file: file,
                        row: node.loc.start.line,
                        column: node.loc.start.column,
                        before: sourceCode,
                        after: sourceCode,
                        message: `自定义组件---${method}: ${'没有相对应的方法'}`
                    }, 'error');
                }
            }
        });
    }

    // 处理不支持的Behavior方法
    function handleBehavior() {
        Object.keys(componentConf.Behavior).forEach(method => {
            const confValue = componentConf.Behavior[method];
            if (confValue === null && t.isIdentifier(path.node.key, {name: method})) {
                const parent = path.parentPath.parentPath.node;
                if (parent.type === 'CallExpression' && parent.callee.name === 'Behavior') {
                    log.logger({
                        type: 'Behavior api',
                        file: file,
                        row: node.loc.start.line,
                        column: node.loc.start.column,
                        before: sourceCode,
                        after: sourceCode,
                        message: `自定义组件---Behavior[${method}]: ${'没有相对应的方法'}`
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
function handleApiConfigTransform({ctx, path, api, prefix, transformedCtx, file, log}) {
    const method = getNodeMethodName(path.node);
    if (!(ctx === prefix && method && api[ctx] && api[ctx][method])) {
        return;
    }
    const action = api[ctx][method].action;
    switch (action) {
        case 'tip':
            handleTip({ctx, path, api, transformedCtx, method, file, log});
            break;
        case 'mapping':
            handleMapping({ctx, path, api, transformedCtx, method, file, log});
            break;
        case 'delete':
            handleDelete({ctx, path, api, transformedCtx, method, file, log});
            break;
    }

    function handleTip({ctx, path, api, transformedCtx, method, file, log}) {
        const node = path.node;
        const sourceCode = generate(path.node).code;
        const afterCode = transformedCtx[ctx] + '.' + method;
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

    function handleMapping({ctx, path, api, transformedCtx, method, file, log}) {
        const node = path.node;
        const sourceCode = generate(path.node).code;
        // 需要转换
        const mappingName = api[ctx][method].mapping ? api[ctx][method].mapping : method;
        // 只要替换ctx和函数名即可
        const afterCode = transformedCtx[ctx] + '.' + mappingName;
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

    function handleDelete({ctx, path, api, transformedCtx, method, file, log}) {
        const node = path.node;
        let sourceCode = generate(path.node).code;
        let afterCode = '';
        let logType = 'delete api';
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
        }
        else if (path.parentPath) {
            sourceCode = generate(path.parentPath.node).code;
            // 避免移除父节点导致转码异常退出问题。
            try {
                path.parentPath.remove();
            }
            catch (err) {
                // @TODO: 优化日志
                logType = 'transform failed';
                afterCode = sourceCode;
            }
        }

        const methodConfig = api[ctx][method] || {};
        // 增加transform logs
        log.logger({
            type: logType,
            file: file,
            row: node.loc.start.line,
            column: node.loc.start.column,
            before: sourceCode,
            after: afterCode,
            message: ctx + '.' + method + `:${methodConfig.message}`
        }, api[ctx][method].logLevel);
    }
}
