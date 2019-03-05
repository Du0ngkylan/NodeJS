/**
 * @file sms_image.cc
 * @brief sms image object
 * @author DuongMX
 * @date 2018/11/30
 */

#include <opencv2/highgui/highgui.hpp>
#include <opencv2/imgproc/imgproc.hpp>
using namespace cv;

#include "image/sms_image.h"
#include "util/sms_app_util.h"

using namespace std; 

namespace fs = boost::filesystem;

namespace sms_accessor {

  /**
  * @fn
  * RandomString
  * @brief generate random string
  * @param (length=20)
  * @return generated string
  */
  static inline std::string RandomString(int length = 20) {
    auto randchar = []() -> char {
        const char charset[] =
        "0123456789"
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz";
        const size_t max_index = (sizeof(charset) - 1);
        return charset[ rand() % max_index ];
    };
    std::string str(length, 0);
    std::generate_n(str.begin(), length, randchar);
    return "______________" + str;
  }

  /**
  * @fn
  * ReadImage
  * @brief read image (UTF-16 path)
  * @param (file) UTF-16 path
  * @return mat
  */
  static inline cv::Mat ReadImage(wstring &file) {
    if (SmsAppUtil::ExistsFile(file)) {
      // read binary
      std::streampos fsize = 0;
      ifstream ifs(file, ios::in | ios::binary);
      fsize = ifs.tellg();
      ifs.seekg( 0, std::ios::end );
      fsize = ifs.tellg() - fsize;
      ifs.seekg(0, fstream::beg);
      
      // stream to buffer
      vector<uchar> buffer(fsize);
      ifs.read(reinterpret_cast<char*>(&buffer[0]), fsize);
      ifs.close();

      Mat src = imdecode(buffer, cv::IMREAD_UNCHANGED);
      return src;
    } else {
      Mat src;
      return src;
    }
  }

  /**
  * @fn
  * WriteImage
  * @brief write image file (UTF-16 path)
  * @param (out_file) UTF-16 path
  * @param (mat)
  * @param (params)
  * @return success - true : otherwise - false
  */
  static inline bool WriteImage(wstring &out_file, cv::Mat &mat, std::vector<int> &params) {
    bool result = false;
    try {
      // note: 
      //  because it is troublesome to save mat as a format specification file, 
      //  i dealt with by renaming
      auto out_path = fs::wpath(out_file);
      auto dir = out_path.parent_path().string();
      auto ext = out_path.extension().string();
      auto work_path = dir + "\\" + RandomString() + ext;
      result = imwrite(work_path, mat, params);
      if(result) {
        // rename target name
        fs::wpath src_file(work_path);
        fs::rename(src_file, out_file);
        return result;
      } else {
        string message = "Failed to save thumbnail.";
        SmsErrorLog(message);
        throw SmsException(message);
      }

    } catch (SmsException& ex) {
      throw ex;
    } catch (fs::filesystem_error) {
      throw SmsException("file system error.");
    } catch (...) {
      throw SmsException("other error.");
    }
    return result;
  }

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @param(image_path) UTF-16 image path
  */
  SmsImage::SmsImage(wstring image_path) : m_w_image_path(image_path),
    m_data(nullptr), m_data_length(0), m_image_type(SmsSourceImageType::FILE) {}

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @param(data) image data
  * @param(length) image length
  */
  SmsImage::SmsImage(char *data, size_t length) : m_w_image_path(L""), 
    m_data(data), m_data_length(length), m_image_type(SmsSourceImageType::STREAM) {}

  /**
  * @fn
  * ~SmsImage
  * @brief destructor
  */
  SmsImage::~SmsImage() {}

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @param(thumb_path) thumbnail path
  * @param(container_width) container width
  * @param(container_height) container heght
  * @throw sms_accessor::SmsException in case of error
  */
  void SmsImage::CreateThumbnail(std::wstring thumb_path, size_t container_width, size_t container_height) {
    this->CreateThumbnail(thumb_path, container_width, container_height, 0);
  }

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @param(thumb_path) thumbnail path
  * @param(container_width) container width
  * @param(container_height) container height
  * @param(quality) jpeg quality
  * @throw sms_accessor::SmsException in case of error
  */
  bool SmsImage::CreateThumbnail(wstring wthumb_path, size_t container_width,
   size_t container_height, size_t quality) {

    cv::Mat src = ReadImage(m_w_image_path);
    cv::Mat dst;

    // Couldn't read image file, thwrow Exception
    if (src.cols == 0 &&
        src.rows == 0) {
      string message = "Couldn't read image file.";
      SmsErrorLog(message);
      throw SmsException(message);
    }

    // get original size
    int org_width = src.cols;
    int org_height = src.rows;

    double ratioX = static_cast<double>(container_width) / static_cast<double>(org_width);
    double ratioY = static_cast<double>(container_height) / static_cast<double>(org_height);
    // use whichever multiplier is smaller
    double ratio = ratioX < ratioY ? ratioX : ratioY;

    // now we can get the new height and width
    int new_height = static_cast<int>(ratio * static_cast<double>(org_height));
    int new_width = static_cast<int>(ratio * static_cast<double>(org_width));
    new_height = new_height == 0 ? 1 : new_height;
    new_width = new_width == 0 ? 1 : new_width;

    SmsDebugLog("new_height" + to_string(new_height));
    SmsDebugLog("new_width" + to_string(new_width));

    try {
      // resizing...
      resize(src, dst, Size(new_width, new_height), 0, 0, INTER_AREA);
    } catch(...) {
      string message = "Couldn't resize image.";
      SmsErrorLog(message);
      throw SmsException(message);
    }

    // check size of dst
    if(dst.cols != new_width ||
       dst.rows != new_height) {
      string message = "Couldn't resize image.";
      SmsErrorLog(message);
      throw SmsException(message);
    }

    bool result = false;
    if (0 < quality) {
      // output thumbnail
      std::vector<int> params = {CV_IMWRITE_JPEG_QUALITY, (int)quality};
      result = WriteImage(wthumb_path, dst, params);      
    }
    return result;
  }

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @throw sms_accessor::SmsException in case of error
  */
  cv::Mat SmsImage::GetImageInfo() {
    cv::Mat src = ReadImage(m_w_image_path);

    // Couldn't read image file, thwrow Exception
    if (src.cols == 0 &&
        src.rows == 0) {
      string message = "Couldn't read image file.";
      SmsErrorLog(message);
      throw SmsException(message);
    }

    return src;
  }

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @throw sms_accessor::SmsException in case of error
  */
  bool SmsImage::ConvertJpg(wstring dest_file) {
    cv::Mat src = ReadImage(m_w_image_path);

    // Couldn't read image file, thwrow Exception
    if (src.cols == 0 &&
        src.rows == 0) {
      string message = "Couldn't read image file.";
      SmsErrorLog(message);
      throw SmsException(message);
    }

    // convert to jpg
    std::vector<int> params = {CV_IMWRITE_JPEG_QUALITY, 100};
    return WriteImage(dest_file, src, params);
  }

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @param(thumb_path) thumbnail path
  * @param(container_width) container width
  * @param(container_height) container height
  * @throw sms_accessor::SmsException in case of error
  */
  bool SmsImage::ResizeImage(wstring thumb_path, size_t container_width,
   size_t container_height, bool ratio_keep) {    

    cv::Mat src = ReadImage(m_w_image_path);
    cv::Mat dst;

    // Couldn't read image file, thwrow Exception
    if (src.cols == 0 &&
        src.rows == 0) {
      string message = "Couldn't read image file.";
      SmsErrorLog(message);
      throw SmsException(message);
    }
    int new_height = container_height;
    int new_width = container_width;
    if (ratio_keep) {
      // get original size
      int org_width = src.cols;
      int org_height = src.rows;

      auto ratio_x = static_cast<double>(container_width) / org_width;
      auto ratio_y = static_cast<double>(container_height) / org_height;
      // use whichever multiplier is smaller
      double ratio = ratio_x < ratio_y ? ratio_x : ratio_y;

      // now we can get the new height and width
      new_height = static_cast<int>(ceil(ratio * static_cast<double>(org_height)));
      new_width = static_cast<int>(ceil(ratio * static_cast<double>(org_width)));
    }
    new_height = new_height == 0 ? 1 : new_height;
    new_width = new_width == 0 ? 1 : new_width;

    try {
      // resizing...
      resize(src, dst, Size(new_width, new_height), 0, 0, INTER_AREA);
    } catch(...) {
      string message = "Couldn't resize image.";
      SmsErrorLog(message);
      throw SmsException(message);
    }

    // check size of dst
    if(dst.cols != new_width || dst.rows != new_height) {
      string message = "Couldn't resize image.";
      SmsErrorLog(message);
      throw SmsException(message);
    }

    // output resized image
    std::vector<int> params = {CV_IMWRITE_JPEG_QUALITY, 100};
    return WriteImage(thumb_path, dst, params);
  }
}
