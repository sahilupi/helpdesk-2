

/*
 Permissions for Helpdesk. Define Roles / Groups.
 --- group:action action action

 *                              = all permissions for grp
 create                         = create permission for grp
 delete                         = delete permission for grp
 edit                            = edit permission for grp
 editSelf                       = edit Self Created Items
 assignee                       = allowed to be assigned to a ticket
 view                           = view permission for grp

 ticket:attachment              = can add attachment
 ticket:removeAttachment        = can remove attachment
 ticket:viewHistory             = can view ticket history on single page
 ticket:setAssignee             = can set ticket Assignee
 ticket:public                  = can view public created tickets
 ticket:notifications_create    = send notification on ticket created

 notes:                         = Internal Notes on tickets

 plugins:manage                 = user can add/remove Plugins
 */
const roles = {
  admin: {
    id: 'admin',
    name: 'Administrator',
    description: 'Administrators',
    allowedAction: ['*']
  },
  mod: {
    id: 'mod',
    name: 'Moderator',
    description: 'Moderators',
    allowedAction: [
      'mod:*',
      'dashboard:*',
      'ticket:create edit view attachment removeAttachment',
      'comment:*',
      'notes:*',
      'reports:view'
    ]
  },
  support: {
    id: 'support',
    name: 'Support',
    description: 'Support User',
    allowedAction: [
      'ticket:*',
      'dashboard:*',
      'accounts:create edit view delete',
      'comment:editSelf create delete',
      'notes:create view',
      'reports:view',
      'notices:*'
    ]
  },
  user: {
    id: 'user',
    name: 'User',
    description: 'User',
    allowedAction: ['ticket:create editSelf attachment print viewall', 'comment:create editSelf']
  }
}

if (typeof exports !== 'undefined') {
  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = roles
  }
} else {
  window.ROLES = roles
}
