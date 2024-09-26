require "test_helper"

class UploadsControllerTest < ActionDispatch::IntegrationTest
  test "should get new" do
    get uploads_new_url
    assert_response :success
  end

  test "should get create" do
    get uploads_create_url
    assert_response :success
  end
end
