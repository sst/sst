require 'json'
module SST
  class << self
    private

    def parse_resource(resource_name)
      env_var = "SST_RESOURCE_#{resource_name}"
      parse_json(ENV[env_var])
    end

    def parse_json(json_string)
      return nil if json_string.nil?
      JSON.parse(json_string)
    rescue JSON::ParserError
      json_string  # Return the original string if it's not valid JSON
    end

  end

  def MyService
    @MyService ||= parse_resource('MyService')
  end

  def MyVpc
    @MyVpc ||= parse_resource('MyVpc')
  end

  def MyBucket
    @MyBucket ||= parse_resource('MyBucket')
  end

end
