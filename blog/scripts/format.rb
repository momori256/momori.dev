#! /usr/bin/env ruby

if (ARGV.empty?)
  puts "ruby format.rb [input] [output]"
  return
end

input = ARGV[0]

text = File.open(input, "r") do |f|
  ja = /\p{Hiragana}|\p{Katakana}|[一-龠々]/

  tok = /'|#|\+|-|\`/
  l_tok = /#{tok}|\[|\(/
  r_tok = /#{tok}|\]|\)/

  f.readlines.map do |l|
    l.gsub(/。/, %q{. })
      .gsub(/、/, %q{, })
      .gsub(/(#{ja})(\w|#{l_tok})/, '\1 \2')
      .gsub(/(\w|#{r_tok})(#{ja})/, '\1 \2')
      .gsub(/\.\s\s\s$/, %q{.  })
      .gsub(/(\S)\s$/, '\1')
  end
end

output = ARGV.count == 1 ? ARGV[0] : ARGV[1]
File.open(output, "w") do |f|
  f.puts text
end
