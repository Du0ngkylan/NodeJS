/**
 * @file sms_db_if.h
 * @brief sms database interface header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_DB_IF_H
#define SMS_DB_IF_H

#include "sms_db/SmsDatabaseException.h"
#include "sms_db/SmsTransaction.h"
#include "sms_db/SmsColumn.h"
#include "sms_db/SmsStatement.h"
#include "sms_db/SmsDatabase.h"
#include "SmsDatabaseUtil.h"

// manager
#include "sms_db/manager/sms_base_database.h"
#include "sms_db/manager/sms_master_database.h"
#include "sms_db/manager/sms_school_database.h"

// model
#include "sms_db/model/sms_school_info.h"
#include "sms_db/model/class/sms_class_item.h"
#include "sms_db/model/class/sms_student_info.h"

#define DB_VERSION         "0.00.01"
#define DB_VERSION_NUMBER  1  // 10000

#endif  // SMS_DB_IF_H