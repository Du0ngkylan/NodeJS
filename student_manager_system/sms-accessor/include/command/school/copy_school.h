/**
 * @file copy_school.h
 * @brief copy school command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_COPY_SCHOOL_H_
#define SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_COPY_SCHOOL_H_

#include "../../accessor_command.h"

namespace sms_accessor {

const std::wstring KOUJI = L"\\kouji.xml";
const std::wstring SCHOOL_DB = L"\\schoolDB.db";

/**
 * @class SmsCopyConstruction
 * @brief copy construction command
 */
class SmsCopyConstruction : public SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsCopyConstruction
   * @brief constructor
   */
  SmsCopyConstruction();

  /**
   * @fn
   * ~SmsCopyConstruction
   * @brief destructor
   */
  ~SmsCopyConstruction();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param (request) request json
   * @param (raw) raw string
   */
  json11::Json ExecuteCommand(json11::Json& request, std::string& raw);

 private:
  /**
   * @fn
   * CreateNewDir
   * @brief create new directory
   * @param(name) name
   */
  void CreateNewDir(std::wstring path);

  /**
   * @fn
   * DirectoriesValidation
   * @brief directories validation
   * @param src_construction_dir source construction dir
   * @param src_kouji_file source kouji file
   * @param src_contruction_id source contruction id
   */
  void DirectoriesValidation(std::wstring& src_construction_dir,
                             std::wstring& src_kouji_file,
                             const int src_contruction_id);

  /**
   * @fn
   * ArgurmentsValidation
   * @brief argument validation
   * @param(arguments) arguments
   * @param use_order_folder use order folder
   * @param src_construction_id source construction id
   * @param display_order new construction id
   * @param new_data_folder new data folder
   * @param use_external_folder use external folder
   * @param use_shared use shared
   */
  void ArgurmentsValidation(const json11::Json arguments,
                            bool& use_order_folder,
                            int& src_construction_id,
                            int& display_order,
                            std::wstring& new_data_folder,
                            bool& use_external_folder,
                            bool& use_shared
                            );
  /**
  * @fn
  * GetBasePathToFullPath
  * @brief return base path to full path
  * @param full_path
  * @return base path
  */
  std::wstring GetBasePathToFullPath(std::wstring full_path);
 private:
  std::wstring m_data_dir;
  std::string m_error_type;
  std::string m_create_date;
  std::string m_guid;
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_COPY_SCHOOL_H_
