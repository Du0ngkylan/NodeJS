/**
 * @file create_thumbnail.h
 * @brief CreateThumbnail command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_IMAGE_CREATE_THUMBNAIL_H
#define SMS_ACCESSOR_INCLUDE_COMMAND_IMAGE_CREATE_THUMBNAIL_H

#include "../accessor_command.h"

namespace sms_accessor {

/**
 * @class SmsCreateThumbnail
 * @brief Create Thumbnail command
 */
class SmsCreateThumbnail : public SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsCreateThumbnail
   * @brief constructor
   */
  SmsCreateThumbnail();

  /**
   * @fn
   * ~SmsCreateThumbnail
   * @brief destructor
   */
  ~SmsCreateThumbnail();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param (request) request json
   * @param (raw) raw string
   */
  json11::Json ExecuteCommand(json11::Json& request, std::string& raw);

  /**
   * @fn
   * Validator
   * @param (request) request json
   * @return bool result
   */
  bool validateRequestParam(json11::Json& request);

  /**
   * @fn
   * UTF-8 to Shift-jis converter. 
   * @param (string) UTF-8 string
   * @return std::string shift-jis string
   */
  std::string SmsCreateThumbnail::UTF8toSjis(std::string srcUTF8);

 private:
  // store error type
  std::string m_error_type;

  // error message
  std::string errorMessage;
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_IMAGE_CREATE_THUMBNAIL_H