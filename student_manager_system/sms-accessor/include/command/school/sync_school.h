/**
 * @file sync_school.h
 * @brief sync school command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_SYNC_SCHOOL_H_
#define SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_SYNC_SCHOOL_H_

#include "../../accessor_command.h"
#include "sms_db_if.h"

namespace sms_accessor {

/**
 * @class SmsSyncSchool
 * @brief get photo info tree command
 */
class SmsSyncSchool : public SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsSyncSchool
   * @brief constructor
   */
  SmsSyncSchool();

  /**
   * @fn
   * ~SmsSyncSchool
   * @brief destructor
   */
  ~SmsSyncSchool();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param request request json
   * @param raw raw string
   * @return result json
   */
  json11::Json ExecuteCommand(json11::Json &request, std::string &raw);
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_SYNC_SCHOOL_H_
