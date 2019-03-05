/**
 * @file accessor_command_factory.h
 * @brief sms accessor command factory header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef   SMS_ACCESSOR_INCLUDE_ACCESSOR_COMMAND_FACTORY_H_
#define   SMS_ACCESSOR_INCLUDE_ACCESSOR_COMMAND_FACTORY_H_

#include "../accessor_command.h"

namespace sms_accessor {

/**
 * @class SmsAccessorCommandFactory
 * @brief  Sms accessor command factory
 */
class SmsAccessorCommandFactory {
public:
  /**
   * @fn
   * SmsAccessorCommandFactory
   * @brief constructor
   */
  SmsAccessorCommandFactory();

  /**
   * @fn
   * SmsAccessorCommandFactory
   * @brief destructor
   */
  ~SmsAccessorCommandFactory();

  /**
   * @fn
   * SetDataFolder
   * @param(data_folder_path)data folder path
   * @brief set data folder path
   */
  void SetDataFolder(const wchar_t* data_folder_path);

  /**
   * @fn
   * SetWorkFolder
   * @param(accessor_work_path)data folder path
   * @brief set data folder path
   */
  void SetWorkFolder(const wchar_t* accessor_work_path);

  /**
   * @fn
   * CreateCommands
   * @brief create commands
   */
  void CreateCommands();

  /**
  * @fn
  * DeleteCommands
  * @brief delete commands
  */
  void DeleteCommands();

  /**
  * @fn
  * GetCommand
  * @brief get command
  * @param(command) command string
  */
  SmsAccessorCommand *GetCommand(std::string command);

private:
  std::map<std::string, SmsAccessorCommand*> commands; 
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_ACCESSOR_COMMAND_FACTORY_H_
