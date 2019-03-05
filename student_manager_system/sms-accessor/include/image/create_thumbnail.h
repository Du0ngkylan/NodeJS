/**
 * @file create_thumbnail.h
 * @brief CreateThumbnail command header
 * @author kanegon
 * @date 2018/06/11
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_BOOKRACK_CREATE_THUMBNAIL_H
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_BOOKRACK_CREATE_THUMBNAIL_H

#include "../accessor_command.h"

namespace goyo_bookrack_accessor {

/**
 * @class GoyoCreateThumbnail
 * @brief Create Thumbnail command
 */
class GoyoCreateThumbnail : public GoyoAccessorCommand {
 public:
  /**
   * @fn
   * GoyoCreateThumbnail
   * @brief constructor
   */
  GoyoCreateThumbnail();

  /**
   * @fn
   * ~GoyoCreateThumbnail
   * @brief destructor
   */
  ~GoyoCreateThumbnail();

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
  std::string GoyoCreateThumbnail::UTF8toSjis(std::string srcUTF8);

 private:
  // store error type
  std::string m_error_type;

  // error message
  std::string errorMessage;
};

}  // namespace goyo_bookrack_accessor

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_BOOKRACK_CREATE_THUMBNAIL_H