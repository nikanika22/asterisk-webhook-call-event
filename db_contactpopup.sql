
USE `contact_popup_prod`;
SET FOREIGN_KEY_CHECKS = 0;


/*Table structure for table `customer_blacklist` */

DROP TABLE IF EXISTS `customer_blacklist`;

CREATE TABLE `customer_blacklist` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `groupId` int(11) NOT NULL,
  `did` varchar(50) DEFAULT NULL,
  `phone` varchar(12) NOT NULL,
  `calltype` varchar(50) NOT NULL,
  `is_blacklist` int(1) DEFAULT NULL,
  `voice_server` varchar(50) DEFAULT NULL,
  `reason` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `groupId` (`phone`,`groupId`,`calltype`),
  KEY `calltype` (`calltype`),
  KEY `phone` (`phone`),
  KEY `groupId_2` (`groupId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `customers` */

DROP TABLE IF EXISTS `customers`;

CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customerCode` varchar(50) DEFAULT NULL,
  `firstName` varchar(50) NOT NULL,
  `lastName` varchar(50) NOT NULL,
  `avatar` varchar(150) DEFAULT NULL,
  `titleId` int(11) DEFAULT NULL,
  `gender` enum('male','female') DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `groupId` int(11) DEFAULT NULL,
  `tags_list` varchar(255) DEFAULT NULL,
  `sourceDataId` int(11) DEFAULT NULL,
  `status` enum('publish','draft','trash') DEFAULT 'publish',
  `trashed_by` int(11) DEFAULT NULL,
  `trashed_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_case_id` int(11) DEFAULT NULL,
  `background` varchar(255) DEFAULT '#39a6f9',
  `salt` varchar(255) DEFAULT NULL,
  `phoneCode` varchar(255) DEFAULT NULL,
  `phoneSeq` int(11) DEFAULT 1,
  `birthday` date DEFAULT NULL,
  `customerType` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customerCode` (`customerCode`,`phoneSeq`),
  KEY `titleId` (`titleId`),
  KEY `groupId` (`groupId`),
  KEY `phone` (`phone`),
  KEY `mobile` (`mobile`),
  KEY `last_case_id` (`last_case_id`),
  FULLTEXT KEY `seach_with_keyword` (`customerCode`,`firstName`,`lastName`,`mobile`,`phone`,`email`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`titleId`) REFERENCES `title` (`titleId`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `customers_ibfk_2` FOREIGN KEY (`groupId`) REFERENCES `groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `data_history` */

DROP TABLE IF EXISTS `data_history`;

CREATE TABLE `data_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `action` enum('update','insert','delete','other','view','export','asterisk') NOT NULL DEFAULT 'other',
  `action_type` enum('customer','contact','lead','other','user','record','group','group_hotline','group_module','group_context','list_numbers') NOT NULL,
  `action_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `groupId` int(11) DEFAULT NULL,
  `data_change` text DEFAULT NULL COMMENT 'Change history',
  `text` text DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `departments` */

DROP TABLE IF EXISTS `departments`;

CREATE TABLE `departments` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE current_timestamp(),
  `updated_at` timestamp NULL DEFAULT '0000-00-00 00:00:00',
  `groupId` int(11) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `status` enum('trash','publish') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'publish',
  `extensions` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `queues` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contextout` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `agents` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `leaders` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `did` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `email_config` */

DROP TABLE IF EXISTS `email_config`;

CREATE TABLE `email_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupId` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `smtp_config` text NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `extension_config` */

DROP TABLE IF EXISTS `extension_config`;

CREATE TABLE `extension_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `extension` varchar(10) DEFAULT NULL,
  `agentName` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `groupId` int(11) DEFAULT NULL,
  `connector_server` varchar(255) DEFAULT NULL,
  `config` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `extension_role` */

DROP TABLE IF EXISTS `extension_role`;

CREATE TABLE `extension_role` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupId` int(11) NOT NULL,
  `modules` text DEFAULT NULL,
  `create_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `create_by` varchar(255) DEFAULT NULL,
  `update_at` datetime DEFAULT NULL,
  `update_by` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `extension_status_log` */

DROP TABLE IF EXISTS `extension_status_log`;

CREATE TABLE `extension_status_log` (
  `id` bigint(11) NOT NULL AUTO_INCREMENT,
  `pbx_ip` varchar(100) DEFAULT NULL,
  `extension` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `device` text DEFAULT NULL,
  KEY `id` (`id`),
  KEY `pbx_ip` (`pbx_ip`),
  KEY `extension` (`extension`),
  KEY `created_at` (`created_at`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `extensions_mapping` */

DROP TABLE IF EXISTS `extensions_mapping`;

CREATE TABLE `extensions_mapping` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `extension_number` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `department_id` int(10) unsigned DEFAULT NULL,
  `branch_id` int(10) unsigned DEFAULT NULL,
  `region_id` int(10) unsigned DEFAULT NULL,
  `cluster_id` int(11) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `groupId` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `department_id` (`department_id`),
  KEY `branch_id` (`branch_id`),
  KEY `region_id` (`region_id`),
  CONSTRAINT `extensions_mapping_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `extensions_mapping_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `jnt_branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `extensions_mapping_ibfk_3` FOREIGN KEY (`region_id`) REFERENCES `jnt_regions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*Table structure for table `field_custom` */

DROP TABLE IF EXISTS `field_custom`;

CREATE TABLE `field_custom` (
  `fieldId` int(11) NOT NULL AUTO_INCREMENT,
  `fieldTable` varchar(100) NOT NULL,
  `fieldName` varchar(100) NOT NULL,
  `fieldNameId` int(11) DEFAULT NULL,
  `fieldValue` mediumtext DEFAULT NULL,
  `fieldSort` int(11) DEFAULT NULL,
  `fieldRequired` tinyint(1) DEFAULT 0 COMMENT 'Bat buoc hay khong?',
  `groupId` int(11) DEFAULT NULL,
  `status` enum('publish','trash') DEFAULT 'publish',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `trashed_at` timestamp NULL DEFAULT NULL,
  `trashed_by` int(11) DEFAULT NULL,
  `fieldIcon` varchar(255) DEFAULT NULL,
  `fieldType` enum('text','number','textarea','date','time','datetime','select','mobile','email','url') NOT NULL,
  `fieldPlaceholder` varchar(100) DEFAULT NULL COMMENT 'placeholder/option default',
  PRIMARY KEY (`fieldId`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `field_custom_data` */

DROP TABLE IF EXISTS `field_custom_data`;

CREATE TABLE `field_custom_data` (
  `fieldId` int(11) NOT NULL COMMENT 'fieldCustomId',
  `fieldDataId` int(11) NOT NULL COMMENT 'vd: customerId',
  `fieldContent` mediumtext DEFAULT NULL,
  PRIMARY KEY (`fieldId`,`fieldDataId`),
  CONSTRAINT `field_custom_data_ibfk_1` FOREIGN KEY (`fieldId`) REFERENCES `field_custom` (`fieldId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `field_custom_view` */

DROP TABLE IF EXISTS `field_custom_view`;

CREATE TABLE `field_custom_view` (
  `viewTable` varchar(100) NOT NULL,
  `viewType` enum('list','report','detail','import','export') NOT NULL,
  `listColumn` mediumtext DEFAULT NULL,
  `groupId` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `trashed_at` timestamp NULL DEFAULT NULL,
  `trashed_by` int(11) DEFAULT NULL,
  `field_view_default` text DEFAULT NULL,
  PRIMARY KEY (`viewTable`,`viewType`,`groupId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `group_config` */

DROP TABLE IF EXISTS `group_config`;

CREATE TABLE `group_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupId` int(11) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `is_abandon` tinyint(1) DEFAULT 0 COMMENT 'neu la 1 thi enable gui email khi co cuoc goi nho',
  `is_voicemail` tinyint(1) DEFAULT 0 COMMENT 'neu la 1 thi enable gui email khi co cuoc goi voicemail',
  `is_forward` tinyint(1) DEFAULT 0,
  `status` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `smtp_out` int(11) DEFAULT 0,
  `time_auto_pause` int(11) DEFAULT NULL COMMENT 'thoi gian pause sau khi ket thuc cuoc goi, seconds',
  `is_remove_did` tinyint(1) DEFAULT 0 COMMENT 'enable/disable auto remove did',
  `is_swap_did` tinyint(1) DEFAULT 0 COMMENT 'enable/disable auto swap did',
  `min_alarm_did` int(10) DEFAULT -1 COMMENT 'so luong did con lai',
  `max_active_did` int(11) DEFAULT NULL,
  `is_notify_did` int(11) DEFAULT 0,
  `max_failures_did` int(11) DEFAULT 0,
  `min_did_left` int(11) DEFAULT -1,
  `updated_by` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `group_context` */

DROP TABLE IF EXISTS `group_context`;

CREATE TABLE `group_context` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `context` varchar(255) DEFAULT NULL,
  `groupId` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `contextType` enum('inbound','outbound') DEFAULT 'outbound',
  `region_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `group_context_did` */

DROP TABLE IF EXISTS `group_context_did`;

CREATE TABLE `group_context_did` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `did` varchar(30) DEFAULT NULL,
  `contextId` int(11) DEFAULT NULL,
  `groupId` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `status` enum('active','lock','disabled') DEFAULT 'active',
  `type` enum('inbound','outbound') DEFAULT NULL,
  `region_id` int(11) unsigned DEFAULT NULL,
  `branch_id` int(11) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `region_id` (`region_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `group_context_did_ibfk_1` FOREIGN KEY (`region_id`) REFERENCES `jnt_regions` (`id`),
  CONSTRAINT `group_context_did_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `jnt_branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `group_hotline` */

DROP TABLE IF EXISTS `group_hotline`;

CREATE TABLE `group_hotline` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fixed_number` text DEFAULT NULL,
  `fixed_provider` varchar(20) DEFAULT NULL,
  `hotline_number` varchar(255) DEFAULT NULL,
  `hotline_number_price` text DEFAULT NULL,
  `queues` varchar(255) DEFAULT NULL,
  `extensions` text DEFAULT NULL COMMENT 'DS extension',
  `discount` float DEFAULT 0 COMMENT 'Chiết khấu',
  `created_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_by` int(11) DEFAULT 0,
  `trashed_at` timestamp NULL DEFAULT NULL,
  `trashed_by` int(11) DEFAULT 0,
  `status` enum('trash','publish') DEFAULT 'publish',
  `groupId` int(11) DEFAULT 0,
  `queue_config` mediumtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `groupId` (`groupId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `groups` */

DROP TABLE IF EXISTS `groups`;

CREATE TABLE `groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupName` varchar(255) NOT NULL,
  `domain` varchar(255) DEFAULT NULL,
  `domain_chrome` varchar(255) DEFAULT NULL,
  `webhook_url` varchar(255) DEFAULT NULL,
  `status` enum('trash','active','pending','lock') DEFAULT NULL,
  `limitUser` int(11) DEFAULT NULL,
  `socket_url` varchar(255) DEFAULT NULL,
  `webhook_info` text DEFAULT NULL,
  `webhook_active` tinyint(1) DEFAULT 0,
  `connector_server` varchar(255) DEFAULT NULL,
  `recording_url` varchar(255) DEFAULT NULL COMMENT 'link ghi am hien tai',
  `recording_url_auth` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `trashed_at` datetime DEFAULT NULL,
  `trashed_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `updated_by` int(11) DEFAULT NULL,
  `did` text DEFAULT NULL,
  `contextin` varchar(100) DEFAULT NULL,
  `contextout` varchar(100) DEFAULT NULL,
  `secret` varchar(255) DEFAULT NULL,
  `api_status` enum('enable','disable') DEFAULT 'disable',
  `webhook_external` text DEFAULT NULL COMMENT 'webhook tuy chinh : getfly, other',
  `webhook_type` text DEFAULT NULL,
  `config` mediumtext DEFAULT NULL,
  `config_dashboard` mediumtext DEFAULT NULL,
  `sms_config` mediumtext DEFAULT NULL,
  `voice_mail_context` varchar(100) DEFAULT NULL,
  `event_call_config` text DEFAULT NULL,
  `zendesk_config` text DEFAULT NULL,
  `chrome_intergrate_type` enum('default','zendesk','haravan','freshdesk','hubspot','kiot_viet') DEFAULT 'default',
  `domain_integrate` varchar(100) DEFAULT NULL,
  `haravan_config` text DEFAULT NULL,
  `webhook_custom_var` text DEFAULT NULL,
  `pds_config` text DEFAULT NULL,
  `mifone_config` text DEFAULT NULL,
  `webrtc_config` text DEFAULT NULL,
  `is_click2call` tinyint(4) DEFAULT 1,
  `is_call_survey` tinyint(1) DEFAULT 0,
  `config_csat` text DEFAULT NULL,
  `is_midesk` varchar(255) DEFAULT NULL,
  `is_saleforce` tinyint(1) DEFAULT 0,
  `domain_login` varchar(255) DEFAULT 'contact-popup.mipbx.vn' COMMENT 'domain login cho tung khac hang',
  `recording_url_interval` varchar(255) DEFAULT NULL COMMENT 'link ghi am qua khu',
  `config_rabbitmq` text DEFAULT NULL,
  `proxy_server` varchar(50) DEFAULT NULL,
  `last_recording` varchar(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `status` (`status`),
  KEY `secret` (`secret`),
  FULLTEXT KEY `groups_search` (`groupName`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*Table structure for table `ip_lock` */

DROP TABLE IF EXISTS `ip_lock`;

CREATE TABLE `ip_lock` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ip_client` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lock_time` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `ip_whitelist` */

DROP TABLE IF EXISTS `ip_whitelist`;

CREATE TABLE `ip_whitelist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupId` int(11) DEFAULT NULL,
  `ip` varchar(255) DEFAULT NULL,
  `type` enum('direct','range') DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `ivrinbound_did` */

DROP TABLE IF EXISTS `ivrinbound_did`;

CREATE TABLE `ivrinbound_did` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupid` int(11) DEFAULT 0,
  `did` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `trashed_at` datetime DEFAULT NULL,
  `trashed_by` varchar(255) DEFAULT NULL,
  `status` enum('active','unactive','trash') DEFAULT NULL,
  `workflow` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `did` (`did`),
  KEY `status` (`status`),
  KEY `groupid` (`groupid`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `ivrinbound_general_settings` */

DROP TABLE IF EXISTS `ivrinbound_general_settings`;

CREATE TABLE `ivrinbound_general_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupid` int(11) DEFAULT 0,
  `type` enum('music_on_hold') DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `value` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `groupid_2` (`groupid`,`type`),
  KEY `groupid` (`groupid`),
  KEY `type` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `ivrinbound_inbound_routes` */

DROP TABLE IF EXISTS `ivrinbound_inbound_routes`;

CREATE TABLE `ivrinbound_inbound_routes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupid` int(11) DEFAULT 0,
  `did` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `timework_id` int(11) DEFAULT 0,
  `destination_match_time` int(11) DEFAULT 0,
  `destination_non_match_time` int(11) DEFAULT 0,
  `status` enum('trash','active','unactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `trashed_at` datetime DEFAULT NULL,
  `trashed_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `destination_type` varchar(100) DEFAULT NULL,
  `destination_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `groupid` (`groupid`),
  KEY `destination_match_time` (`destination_match_time`),
  KEY `destination_non_match_time` (`destination_non_match_time`),
  KEY `status` (`status`),
  KEY `timework_id` (`timework_id`),
  KEY `did` (`did`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `ivrinbound_ivr` */

DROP TABLE IF EXISTS `ivrinbound_ivr`;

CREATE TABLE `ivrinbound_ivr` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupid` int(10) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `did` varchar(20) NOT NULL,
  `type_ivr` enum('audio','digit_wrong','non_announcement') DEFAULT 'audio',
  `recording_id` int(11) DEFAULT 0,
  `file_name` varchar(255) DEFAULT NULL,
  `file_name_original` varchar(255) DEFAULT NULL,
  `file_ext` varchar(50) DEFAULT NULL,
  `file_size` int(11) DEFAULT 0,
  `file_duration` int(11) DEFAULT 0,
  `destination` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `trashed_at` datetime DEFAULT NULL,
  `trashed_by` varchar(255) DEFAULT NULL,
  `status` enum('active','unactive','trash') DEFAULT NULL,
  `route_extension` varchar(20) DEFAULT NULL,
  `route_queue` varchar(20) DEFAULT NULL,
  `route_fw` varchar(20) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `storage_path` varchar(255) DEFAULT NULL,
  `storage_object_name` varchar(255) DEFAULT NULL,
  `digit_timeout` int(11) DEFAULT 0,
  `digit_timeout_action` varchar(50) DEFAULT NULL,
  `digit_timeout_value` varchar(50) DEFAULT NULL,
  `digit_wrong_id` int(11) DEFAULT 0 COMMENT 'ID cua kich ban digit wrong, duoc assign trong ivr chinh',
  PRIMARY KEY (`id`),
  KEY `did` (`did`),
  KEY `groupid` (`groupid`),
  KEY `status` (`status`),
  KEY `type_ivr` (`type_ivr`),
  KEY `destination` (`destination`),
  KEY `recording_id` (`recording_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `ivrinbound_ivr_detail` */

DROP TABLE IF EXISTS `ivrinbound_ivr_detail`;

CREATE TABLE `ivrinbound_ivr_detail` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupid` int(11) DEFAULT 0,
  `ivr_id` int(11) DEFAULT 0,
  `digit` varchar(8) DEFAULT NULL,
  `type` enum('recording','callback','hangup') DEFAULT NULL,
  `value` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `groupid` (`groupid`),
  KEY `digit` (`digit`),
  KEY `type` (`type`),
  KEY `ivr_id` (`ivr_id`),
  CONSTRAINT `ivrinbound_ivr_detail_ibfk_1` FOREIGN KEY (`ivr_id`) REFERENCES `ivrinbound_ivr` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `ivrinbound_ivr_digit_wrong` */

DROP TABLE IF EXISTS `ivrinbound_ivr_digit_wrong`;

CREATE TABLE `ivrinbound_ivr_digit_wrong` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupid` int(11) DEFAULT 0,
  `ivr_id` int(11) DEFAULT 0,
  `times` varchar(3) DEFAULT NULL COMMENT 'So lan sai',
  `type` enum('callback','hangup','recording','repeat_and_replace_announcement') DEFAULT NULL,
  `value` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `groupid` (`groupid`),
  KEY `ivr_id` (`ivr_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `ivrinbound_recording` */

DROP TABLE IF EXISTS `ivrinbound_recording`;

CREATE TABLE `ivrinbound_recording` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupid` int(11) DEFAULT 0,
  `name` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_name_original` varchar(255) DEFAULT NULL,
  `file_ext` varchar(50) DEFAULT NULL,
  `file_size` int(11) DEFAULT 0,
  `file_duration` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `trashed_at` datetime DEFAULT NULL,
  `trashed_by` varchar(255) DEFAULT NULL,
  `status` enum('active','unactive','trash') DEFAULT NULL,
  `storage_path` varchar(255) DEFAULT NULL,
  `storage_object_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `groupid` (`groupid`),
  KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `ivrinbound_time_conditions` */

DROP TABLE IF EXISTS `ivrinbound_time_conditions`;

CREATE TABLE `ivrinbound_time_conditions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupid` int(11) DEFAULT 0,
  `name` varchar(255) DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `timegroup_id` int(11) DEFAULT 0,
  `destination_match_type` varchar(100) DEFAULT NULL COMMENT 'match_type',
  `destination_match_time` varchar(100) DEFAULT '0' COMMENT 'match_id',
  `destination_non_match_type` varchar(100) DEFAULT NULL COMMENT 'non_match_type',
  `destination_non_match_time` varchar(100) DEFAULT '0' COMMENT 'non_match_id',
  `status` enum('trash','active','unactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `trashed_at` datetime DEFAULT NULL,
  `trashed_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `groupid` (`groupid`),
  KEY `destination_match_time` (`destination_match_time`),
  KEY `destination_non_match_time` (`destination_non_match_time`),
  KEY `status` (`status`),
  KEY `timegroup_id` (`timegroup_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `ivrinbound_time_groups` */

DROP TABLE IF EXISTS `ivrinbound_time_groups`;

CREATE TABLE `ivrinbound_time_groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupid` int(11) DEFAULT 0,
  `name` varchar(255) DEFAULT NULL,
  `times_work` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `trashed_at` datetime DEFAULT NULL,
  `trashed_by` varchar(255) DEFAULT NULL,
  `status` enum('active','unactive','trash') DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `groupid` (`groupid`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `jnt_branches` */

DROP TABLE IF EXISTS `jnt_branches`;

CREATE TABLE `jnt_branches` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `region_id` int(10) unsigned NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `groupId` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `alias` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `region_id` (`region_id`),
  CONSTRAINT `jnt_branches_ibfk_1` FOREIGN KEY (`region_id`) REFERENCES `jnt_regions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `jnt_clusters_pbx` */

DROP TABLE IF EXISTS `jnt_clusters_pbx`;

CREATE TABLE `jnt_clusters_pbx` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `client_id` varchar(255) NOT NULL,
  `client_secret` varchar(255) NOT NULL,
  `token` text DEFAULT NULL,
  `token_expires_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ami_user` varchar(50) DEFAULT NULL,
  `ami_secret` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `jnt_departments` */

DROP TABLE IF EXISTS `jnt_departments`;

CREATE TABLE `jnt_departments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `branch_id` int(10) unsigned DEFAULT NULL,
  `region_id` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `groupId` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `alias` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `region_id` (`region_id`),
  CONSTRAINT `jnt_departments_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `jnt_branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `jnt_departments_ibfk_2` FOREIGN KEY (`region_id`) REFERENCES `jnt_regions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `jnt_regions` */

DROP TABLE IF EXISTS `jnt_regions`;

CREATE TABLE `jnt_regions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `groupId` int(10) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `alias` varchar(100) DEFAULT NULL,
  `cluster_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cluster_id` (`cluster_id`),
  CONSTRAINT `jnt_regions_ibfk_1` FOREIGN KEY (`cluster_id`) REFERENCES `jnt_clusters_pbx` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `jnt_user_access_scopes` */

DROP TABLE IF EXISTS `jnt_user_access_scopes`;

CREATE TABLE `jnt_user_access_scopes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `scope_type` enum('region','branch','department') NOT NULL,
  `scope_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `jnt_user_access_scopes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `mi_case` */

DROP TABLE IF EXISTS `mi_case`;

CREATE TABLE `mi_case` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `case_number` varchar(100) DEFAULT NULL,
  `type_case` varchar(50) NOT NULL COMMENT 'customer/lead/contact',
  `type_id` int(11) NOT NULL COMMENT 'customer_id/lead_id/...',
  `channel` enum('voice','misscall','facebook','email','zalo','web','sms','api','order','note') NOT NULL,
  `channel_data_id` varchar(50) DEFAULT NULL COMMENT 'email_id/facebook_id/cdr_id/order_id ...',
  `channel_type` enum('in','out') DEFAULT NULL,
  `channel_source` varchar(150) DEFAULT NULL COMMENT 'sdt/facebook name/email: tao case tu nguon',
  `subject` varchar(255) DEFAULT NULL,
  `priority_id` int(11) DEFAULT NULL,
  `case_sla_time` int(11) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL COMMENT 'list categories id',
  `category_name` varchar(500) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `tags` varchar(255) DEFAULT NULL COMMENT 'list tags id',
  `assign_agent_id` int(11) DEFAULT NULL COMMENT 'Nguoi duoc assign',
  `assign_deparment_id` int(11) DEFAULT NULL COMMENT 'Nhom duoc assign',
  `last_thread_id` int(11) DEFAULT NULL,
  `last_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_updated_by` int(11) DEFAULT NULL,
  `groupId` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL COMMENT 'Nguoi tao',
  `case_status` enum('opened','pending','closed') DEFAULT 'opened',
  `status` enum('publish','trash') DEFAULT 'publish',
  `trashed_at` timestamp NULL DEFAULT NULL,
  `trashed_by` int(11) DEFAULT NULL,
  `ip_address` varchar(25) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `groupId` (`groupId`),
  KEY `created_at` (`created_at`),
  KEY `customer_id` (`customer_id`),
  KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `mi_case_category` */

DROP TABLE IF EXISTS `mi_case_category`;

CREATE TABLE `mi_case_category` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `sla_time` int(11) DEFAULT NULL COMMENT 'Second',
  `parent` int(11) NOT NULL DEFAULT 0,
  `status` enum('publish','trash') NOT NULL DEFAULT 'publish',
  `order` int(11) DEFAULT 0,
  `created_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `groupid` int(5) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  FULLTEXT KEY `search_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `mi_case_priority` */

DROP TABLE IF EXISTS `mi_case_priority`;

CREATE TABLE `mi_case_priority` (
  `priority_id` int(11) NOT NULL AUTO_INCREMENT,
  `priority` varchar(100) NOT NULL,
  `priority_sla_time` int(11) NOT NULL COMMENT 'second',
  `priority_desc` varchar(255) DEFAULT NULL,
  `priority_color` varchar(100) DEFAULT NULL,
  `priority_urgency` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `groupid` int(11) DEFAULT NULL,
  PRIMARY KEY (`priority_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `mi_case_thread` */

DROP TABLE IF EXISTS `mi_case_thread`;

CREATE TABLE `mi_case_thread` (
  `thread_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `case_id` bigint(20) NOT NULL,
  `type_thread` varchar(50) DEFAULT NULL COMMENT 'customer/lead/contact/...',
  `type_id` int(11) DEFAULT NULL COMMENT 'customer_id/lead_id/...',
  `thread_by` enum('customer','agent','system','note') DEFAULT NULL,
  `content` text DEFAULT NULL,
  `tags` varchar(255) DEFAULT NULL COMMENT 'list tags id',
  `category` varchar(255) DEFAULT NULL COMMENT 'list categories id',
  `thread_status` enum('publish','trash') DEFAULT 'publish',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `trashed_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `trashed_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`thread_id`),
  KEY `case_id` (`case_id`),
  CONSTRAINT `mi_case_thread_ibfk_1` FOREIGN KEY (`case_id`) REFERENCES `mi_case` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `pbx_config` */

DROP TABLE IF EXISTS `pbx_config`;

CREATE TABLE `pbx_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` enum('pbx','proxy') NOT NULL DEFAULT 'pbx',
  `connector_server` varchar(100) DEFAULT NULL,
  `alias` varchar(100) NOT NULL,
  `ip_local` varchar(100) DEFAULT NULL,
  `domain` varchar(255) DEFAULT NULL,
  `proxy` varchar(255) DEFAULT NULL,
  `port` varchar(10) DEFAULT '5969',
  `created_at` datetime NOT NULL,
  `recording_url` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `connector_server` (`connector_server`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `provider_prefix` */

DROP TABLE IF EXISTS `provider_prefix`;

CREATE TABLE `provider_prefix` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `provider` enum('Viettel','Mobifone','Vinaphone','Gtel','Vietnammobile','International','Fixed','Reddi') NOT NULL,
  `prefix` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `provider_prefix_rate` */

DROP TABLE IF EXISTS `provider_prefix_rate`;

CREATE TABLE `provider_prefix_rate` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `provider_from` varchar(50) NOT NULL,
  `provider_to` text NOT NULL,
  `first_six_seconds` float NOT NULL,
  `every_next_seconds` float NOT NULL,
  `rate` float NOT NULL,
  `groupId` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `status` enum('active','lock') DEFAULT NULL,
  KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `qr_code` */

DROP TABLE IF EXISTS `qr_code`;

CREATE TABLE `qr_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `groupId` int(11) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `time_exprired` datetime DEFAULT NULL,
  `token` text DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `last_send` datetime DEFAULT NULL,
  `cronjob` int(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`),
  KEY `userId_2` (`userId`,`groupId`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `reason_list` */

DROP TABLE IF EXISTS `reason_list`;

CREATE TABLE `reason_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reason_name` varchar(255) DEFAULT NULL,
  `reason_enabled` tinyint(4) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `groupId` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `server_configs` */

DROP TABLE IF EXISTS `server_configs`;

CREATE TABLE `server_configs` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `connector_server` varchar(50) DEFAULT NULL,
  `connector_alias` varchar(50) DEFAULT NULL,
  `ip_local` varchar(50) DEFAULT NULL,
  `ami_host` varchar(50) DEFAULT NULL,
  `ami_username` varchar(50) DEFAULT NULL,
  `ami_secret` varchar(100) DEFAULT NULL,
  `webhook_url` varchar(255) DEFAULT NULL,
  `webhook_url_local` varchar(255) DEFAULT NULL,
  `recording_url` varchar(255) DEFAULT NULL,
  `webhook_port` varchar(10) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','lock') DEFAULT 'active',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `setting` */

DROP TABLE IF EXISTS `setting`;

CREATE TABLE `setting` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupId` int(11) DEFAULT NULL,
  `s_name` varchar(150) NOT NULL,
  `view_name` varchar(150) DEFAULT NULL,
  `s_value` text DEFAULT NULL,
  `is_enable` tinyint(1) DEFAULT 1,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `tags` */

DROP TABLE IF EXISTS `tags`;

CREATE TABLE `tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tag_name` varchar(255) NOT NULL,
  `color` varchar(25) DEFAULT NULL,
  `channel` enum('inbound','outbound','facebook','email','livechat','voice') DEFAULT NULL,
  `groupId` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `status` enum('publish','trash') DEFAULT 'publish',
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  FULLTEXT KEY `tags_search` (`tag_name`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `user_config` */

DROP TABLE IF EXISTS `user_config`;

CREATE TABLE `user_config` (
  `userid` int(11) DEFAULT NULL,
  `groupid` int(11) DEFAULT NULL,
  `is_auto_resume` int(1) DEFAULT 0,
  `time_auto_resume` int(11) DEFAULT 0,
  `time_start_auto_resume` varchar(100) DEFAULT '0',
  `is_hotdesk` int(1) DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `transports` enum('tcp','udp','wss','tls') DEFAULT 'tls' COMMENT 'transports cho mifone',
  `port` int(10) DEFAULT NULL COMMENT 'port mifone',
  `token_freshdesk` varchar(100) DEFAULT NULL,
  `is_use_freshdesk` tinyint(1) DEFAULT 0,
  `auto_answer_inbound` tinyint(1) DEFAULT 0,
  `auto_answer_clicktocall` tinyint(1) DEFAULT 0,
  KEY `userid` (`userid`,`groupid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `user_filter` */

DROP TABLE IF EXISTS `user_filter`;

CREATE TABLE `user_filter` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `groupId` int(11) NOT NULL,
  `filterType` enum('qa','queue','cdr','queue-misscall') DEFAULT NULL,
  `filterName` varchar(255) DEFAULT NULL,
  `filterData` text DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `color` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `user_module` */

DROP TABLE IF EXISTS `user_module`;

CREATE TABLE `user_module` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `groupId` int(11) DEFAULT NULL,
  `module` varchar(50) NOT NULL,
  `action` varchar(255) NOT NULL COMMENT 'JSon',
  `order` int(3) NOT NULL DEFAULT 0,
  `sub_module` varchar(50) NOT NULL,
  `status` enum('trash','publish') DEFAULT 'publish',
  `created_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  `trashed_at` timestamp NULL DEFAULT NULL,
  `trashed_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `groupId` (`groupId`),
  CONSTRAINT `user_module_ibfk_1` FOREIGN KEY (`groupId`) REFERENCES `groups` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `user_module_sort` */

DROP TABLE IF EXISTS `user_module_sort`;

CREATE TABLE `user_module_sort` (
  `id` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `listModules` text DEFAULT NULL,
  `sort` int(11) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `parent` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `user_privileges` */

DROP TABLE IF EXISTS `user_privileges`;

CREATE TABLE `user_privileges` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `action` enum('view','add','edit','delete','import','export') NOT NULL,
  `page` varchar(50) NOT NULL,
  `user_type_id` int(10) NOT NULL,
  `status` enum('publish','trash') DEFAULT 'publish',
  `created_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  `trashed_at` timestamp NULL DEFAULT NULL,
  `trashed_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_type_id` (`user_type_id`),
  CONSTRAINT `user_privileges_ibfk_1` FOREIGN KEY (`user_type_id`) REFERENCES `user_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `user_team` */

DROP TABLE IF EXISTS `user_team`;

CREATE TABLE `user_team` (
  `team_id` int(11) NOT NULL AUTO_INCREMENT,
  `team_name` varchar(255) DEFAULT NULL,
  `team_leader` int(11) DEFAULT NULL,
  `team_agent` mediumtext DEFAULT NULL,
  `team_note` mediumtext DEFAULT NULL,
  `groupid` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `trashed_at` datetime DEFAULT NULL,
  `trashed_by` int(11) DEFAULT NULL,
  `status` enum('publish','trash') DEFAULT 'publish',
  PRIMARY KEY (`team_id`),
  KEY `team_leader` (`team_leader`),
  KEY `team_agent` (`team_agent`(768)),
  KEY `groupid` (`groupid`),
  KEY `status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `user_types` */

DROP TABLE IF EXISTS `user_types`;

CREATE TABLE `user_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `groupId` int(10) DEFAULT 0,
  `status` enum('trash','publish') DEFAULT 'publish',
  `created_at` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  `trashed_at` datetime DEFAULT NULL,
  `trashed_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`,`updated_at`),
  FULLTEXT KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `userCode` varchar(50) DEFAULT NULL,
  `firstName` varchar(50) NOT NULL,
  `lastName` varchar(50) NOT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `avatar` varchar(150) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `typeId` int(11) DEFAULT NULL,
  `groupId` int(11) DEFAULT NULL,
  `lastLogin` datetime DEFAULT NULL,
  `loginType` varchar(100) DEFAULT 'website',
  `status` enum('active','trash','pending','lock') DEFAULT 'pending',
  `address` varchar(255) DEFAULT NULL,
  `extension` varchar(255) DEFAULT NULL,
  `extensions_view` text DEFAULT NULL,
  `agents_view` text DEFAULT NULL,
  `queues` text DEFAULT NULL,
  `queues_config` text DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `role` enum('superadmin','admin','supervisor','manager','agent') DEFAULT NULL,
  `isOnline` int(11) DEFAULT 0,
  `remember_token` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `trashed_at` datetime DEFAULT NULL,
  `trashed_by` int(11) DEFAULT NULL,
  `departmentId` int(11) DEFAULT NULL,
  `queueDynamic` int(11) DEFAULT 0,
  `config` text DEFAULT NULL,
  `time_auto_resume` int(11) DEFAULT 0,
  `groups_view` text DEFAULT NULL,
  `firstLogin` int(1) DEFAULT 0 COMMENT 'giá trị bằng 1 --> tài khoản vừa tạo, chưa login',
  `is_verify` tinyint(1) DEFAULT 0 COMMENT 'giá trị bằng 1 - email thật',
  `is_salesforce` enum('active','lock') DEFAULT NULL,
  `lock_time` varchar(50) DEFAULT NULL,
  `otherId` varchar(50) DEFAULT NULL COMMENT 'tisanmic userId',
  `otherEmail` varchar(255) DEFAULT NULL COMMENT 'tisanmic email',
  `google2fa_secret` varchar(255) DEFAULT NULL,
  `is_google2fa` enum('active','disabled') DEFAULT 'disabled',
  PRIMARY KEY (`id`),
  UNIQUE KEY `userCode` (`userCode`,`groupId`),
  KEY `typeId` (`typeId`),
  KEY `groupId` (`groupId`),
  FULLTEXT KEY `users_search` (`firstName`,`lastName`,`mobile`,`phone`,`email`,`extension`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`typeId`) REFERENCES `user_types` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Table structure for table `users_log` */

DROP TABLE IF EXISTS `users_log`;

CREATE TABLE `users_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupid` int(10) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(50) NOT NULL,
  `ip_address` varchar(15) DEFAULT NULL,
  `status` enum('fail','sign-in','sign-out') DEFAULT NULL,
  `sign_in_time` int(11) DEFAULT NULL,
  `sign_out_time` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `trashed_at` timestamp NULL DEFAULT NULL,
  `trashed_by` int(11) DEFAULT NULL,
  `userCode` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `username` (`username`),
  KEY `created_at` (`created_at`),
  KEY `userCode` (`userCode`),
  KEY `groupid` (`groupid`),
  KEY `sign_in_time` (`sign_in_time`),
  KEY `username_2` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/* Trigger structure for table `users` */

DELIMITER $$

DROP TRIGGER IF EXISTS `after_insert_users` $$
CREATE TRIGGER `after_insert_users`
BEFORE INSERT ON `users`
FOR EACH ROW
BEGIN
    DECLARE new_userCode VARCHAR(50) DEFAULT '';

    -- Gọi function để lấy mã user mới
    SELECT getLastestUserCode_v2(NEW.groupId) INTO new_userCode;

    -- Gán giá trị cho các trường của bản ghi đang được insert
    SET NEW.userCode = new_userCode;
    SET NEW.agents_view = new_userCode;
END$$

DELIMITER ;

set global event_scheduler = 1;

/* Function  structure for function  `getLastestUserCode` */

DROP FUNCTION IF EXISTS `getLastestUserCode`;
DELIMITER $$

CREATE FUNCTION `getLastestUserCode`(group_id varchar(10)) RETURNS varchar(20) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
	declare new_userCode varchar(20) default '';
	select userCode into new_userCode from users where groupId = group_id order by id desc limit 1;
	if(new_userCode = '' OR new_userCode is null) then
		SET new_userCode = CONCAT(IF(LENGTH(group_id)='3',group_id,IF(LENGTH(group_id)='2',CONCAT('0',group_id),CONCAT('00',group_id))),'001');
	else 
		SET new_userCode = CONCAT(IF(LENGTH(group_id)='3',group_id,IF(LENGTH(group_id)='2',CONCAT('0',group_id),CONCAT('00',group_id))),IF(LENGTH(CAST(RIGHT(new_userCode,3) AS INT)+1)='3',CAST(RIGHT(new_userCode,3) AS INT)+1,IF(LENGTH(CAST(RIGHT(new_userCode,3) AS INT)+1)='2',CONCAT('0',CAST(RIGHT(new_userCode,3) AS INT)+1),CONCAT('00',CAST(RIGHT(new_userCode,3) AS INT)+1))));
	end if;
	return new_userCode;
    END $$
DELIMITER ;

/* Function  structure for function  `getLastestUserCode_v2` */

DROP FUNCTION IF EXISTS `getLastestUserCode_v2`;
DELIMITER $$

CREATE FUNCTION `getLastestUserCode_v2`(group_id varchar(10)) RETURNS varchar(20) CHARSET utf8mb4 COLLATE utf8mb4_general_ci
    DETERMINISTIC
BEGIN
	declare new_userCode varchar(20) default '';
	select userCode into new_userCode from users where groupId = group_id order by userCode DESC, id DESC limit 1;
	if(new_userCode = '' OR new_userCode is null) then
		SET new_userCode = CONCAT(IF(LENGTH(group_id)='3' OR LENGTH(group_id)='4',group_id,IF(LENGTH(group_id)='2',CONCAT('0',group_id),CONCAT('00',group_id))),'001');
	else 
		SET new_userCode = CONCAT(IF(LENGTH(group_id)='3' OR LENGTH(group_id)='4',group_id,IF(LENGTH(group_id)='2',CONCAT('0',group_id),CONCAT('00',group_id))),IF(LENGTH(CAST(RIGHT(new_userCode,3) AS INT)+1)='3',CAST(RIGHT(new_userCode,3) AS INT)+1,IF(LENGTH(CAST(RIGHT(new_userCode,3) AS INT)+1)='2',CONCAT('0',CAST(RIGHT(new_userCode,3) AS INT)+1),CONCAT('00',CAST(RIGHT(new_userCode,3) AS INT)+1))));
	end if;
	return new_userCode;
    END $$
DELIMITER ;

