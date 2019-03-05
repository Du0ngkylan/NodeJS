/**
 * @file get_school_detail.h
 * @brief get school detail command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_GET_SCHOOL_DETAIL_H_
#define SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_GET_SCHOOL_DETAIL_H_

#include "../../accessor_command.h"
#include "sms_db_if.h"

namespace sms_accessor {

/**
 * @class SmsGetConstructionDetail
 * @brief get constructions detail command
 */
class SmsGetConstructionDetail : public SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsGetConstructionDetail
   * @brief constructor
   */
  SmsGetConstructionDetail();

  /**
   * @fn
   * ~SmsGetConstructionDetail
   * @brief destructor
   */
  ~SmsGetConstructionDetail();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param (request) request json 
   * @param (raw) raw string
   */
  json11::Json ExecuteCommand(json11::Json &request, std::string &raw);

  /**
   * @fn
   * CreateConstruction
   * @param (info) construction info
   * @param (db) construction database
   * @param (get_folder_size) get folder size flag
   * @brief create construction detail
   * @return construction object
   */
  static json11::Json CreateConstruction(
      Sms_db_manager::model::SmsConstructionInfo &info,
      Sms_db_manager::manager::SmsMasterDatabase &db,
      bool get_folder_size);
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_GET_SCHOOL_DETAIL_H_
