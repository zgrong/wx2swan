/**
 * @file wxml convert swan
 * @author yican
 */

const path = require('path');
const co = require('co');
const chalk = require('chalk');
const json = require('./src/config');
const api = require('./src/api');
const view = require('./src/view');
const css = require('./src/css');
const utils = require('./src/util/index');
const log = require('./src/util/log');

module.exports = function wxmp2swan(pathObj, cb) {
    // 指定转换目录
    pathObj.dist = pathObj.dist || getDefaultDist(pathObj.src);
    let defultLog = pathObj.dist || pathObj.src;
    // dist为文件路径时默认日志目录为此文件目录
    if (!utils.isDirectory(defultLog)) {
        defultLog = path.dirname(defultLog);
    }
    pathObj.log = pathObj.log || defultLog;
    pathObj.type = pathObj.type || 'wxmp2swan';
    const context = {
        ...pathObj,
        logs: [],
        // 可以放一些全局共享的数据
        data: {
            // 重命名组件数据存储
            // renamedComponents: {file: {[oldName]: newName}}
            //
        }
    };
    console.log(chalk.yellow('📦    Transforming workspace files...'));
    co(function* () {
        yield utils.copyProject(pathObj.src, pathObj.dist);
        yield json.transformConfig(context);
        yield api.transformApi(context);
        yield view.transformView(context);
        yield css.transformCss(context);
        yield utils.createWx2swaninfo(pathObj.dist);
    }).then(function () {
        log.saveLog(pathObj.log);
        // utils.saveLog(`${pathObj.log}/log.json`, JSON.stringify(context.logs, null, 4));
        cb && cb(null);
        console.log(chalk.green('🎉    Ok, transform done, check transform log in ')
                    + chalk.blue.underline.bold('log.json')
        );
    }).catch(function (e) {
        cb && cb(e);
        console.log(chalk.red('🚀    run error: ', e));
    });
};

function getDefaultDist(dist) {
    let res = '';
    if (utils.isDirectory(dist)) {
        res = path.join(path.dirname(dist), path.basename(dist) + '_swan');
    } else {
        res = path.join(path.dirname(dist) + '_swan', path.basename(dist));
    }
    return res;
}
