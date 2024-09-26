class UploadsController < ApplicationController
  skip_before_action :verify_authenticity_token

  def new
  end

  def create
    blob = ActiveStorage::Blob.create_and_upload!(
      io: params[:file].tempfile,
      filename: params[:file].original_filename,
      content_type: params[:file].content_type
    )
    url = "https://#{ActiveStorage::Blob.service.bucket.name}.s3.amazonaws.com/#{blob.key}"
    redirect_to root_path(uploaded_url: url)
  end
end
