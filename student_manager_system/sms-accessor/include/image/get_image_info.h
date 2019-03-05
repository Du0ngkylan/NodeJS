/**
 * @file get_image_info.h
 * @brief get image information command header
 * @author kanegon
 * @date 2018/06/12
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_BOOKRACK_GET_IMAGE_INFO_H
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_BOOKRACK_GET_IMAGE_INFO_H

#include "../accessor_command.h"

namespace goyo_bookrack_accessor {

/**
 * @class GoyoGetImageInfo
 * @brief Get Image Information command
 */
class GoyoGetImageInfo : public GoyoAccessorCommand {
 public:
  /**
   * @fn
   * GoyoGetImageInfo
   * @brief constructor
   */
  GoyoGetImageInfo();

  /**
   * @fn
   * ~GoyoGetImageInfo
   * @brief destructor
   */
  ~GoyoGetImageInfo();

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
  std::string GoyoGetImageInfo::UTF8toSjis(std::string srcUTF8);

 private:
  // store error type
  std::string m_error_type;

  // error message
  std::string errorMessage;
};

}  // namespace goyo_bookrack_accessor

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_BOOKRACK_GET_IMAGE_INFO_H