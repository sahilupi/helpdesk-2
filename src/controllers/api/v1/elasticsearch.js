const _ = require('lodash');
const async = require('async');
// const winston = require('winston');
const es = require('../../../elasticsearch');
const ticketSchema = require('../../../models/ticket');
const groupSchema = require('../../../models/group');

const apiElasticSearch = {};

apiElasticSearch.rebuild = function (req, res) {
    es.rebuildIndex();

    return res.json({ success: true });
};

apiElasticSearch.status = function (req, res) {
    const response = {
        esStatus: global.esStatus
    };

    async.parallel([
        function (done) {
            es.getIndexCount(function (err, data) {
                if (err) return done(err);
                response.indexCount = (!_.isUndefined(data.count) ? data.count : 0);
                return done();
            });
        },
        function (done) {
            ticketSchema.getCount(function (err, count) {
                if (err) return done(err);
                response.dbCount = count;
                return done();
            });
        }
    ], function (err) {
        if (err) return res.status(500).json({ success: false, error: err });

        response.inSync = response.dbCount === response.indexCount;

        res.json({ success: true, status: response });
    });
};

apiElasticSearch.search = function (req, res) {
    let limit = (!_.isUndefined(req.query.limit) ? req.query.limit : 100);
    try {
        limit = parseInt(limit);
    } catch (e) {
        limit = 100;
    }

    groupSchema.getAllGroupsOfUserNoPopulate(req.user._id, function (err, groups) {
        if (err) return res.status(400).json({ success: false, error: err });

        const g = _.map(groups, function (i) { return i._id; });

        const obj = {
            index: 'trudesk',
            body: {
                size: limit,
                from: 0,
                query: {
                    bool: {
                        must: {
                            multi_match: {
                                query: req.query.q,
                                type: 'cross_fields',
                                operator: 'and',
                                fields: [
                                    'uid^5',
                                    'subject^4',
                                    'issue^4',
                                    'owner.fullname',
                                    'owner.username',
                                    'owner.email',
                                    'comments.owner.email',
                                    'tags.normalized',
                                    'priority.name',
                                    'type.name',
                                    'group.name',
                                    'comments.comment^3',
                                    'notes.note^3',
                                    'dateFormatted'
                                ],
                                tie_breaker: 0.3
                            }
                        },
                        filter: {
                            terms: { 'group._id': g }
                        }
                    }
                }
            }
        };

        es.esclient.search(obj).then(function (r) {
            res.send(r);
        });
    });
};

module.exports = apiElasticSearch;