/**
 * @file accessor_command_factory.h
 * @brief accessor command factory header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef   ACCESSOR_INCLUDE_ACCESSOR_COMMAND_FACTORY_H_
#define   ACCESSOR_INCLUDE_ACCESSOR_COMMAND_FACTORY_H_

#include "../accessor_command.h"

namespace accessor {

/**
 * @class AccessorCommandFactory
 * @brief  Sms accessor command factory
 */
class AccessorCommandFactory {
public:
  /**
   * @fn
   * AccessorCommandFactory
   * @brief constructor
   */
  AccessorCommandFactory();

  /**
   * @fn
   * AccessorCommandFactory
   * @brief destructor
   */
  ~AccessorCommandFactory();

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
  AccessorCommand *GetCommand(std::string command);

private:
  std::map<std::string, AccessorCommand*> commands; 
};

}  // namespace accessor

#endif  // ACCESSOR_INCLUDE_ACCESSOR_COMMAND_FACTORY_H_
